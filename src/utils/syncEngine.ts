import mqtt, { MqttClient } from 'mqtt';
import { BillState } from '../types';

export interface SyncEngineCallbacks {
  onStateReceived: (state: BillState) => void;
  onPeersChanged: (count: number) => void;
  onError?: (err: Error) => void;
}

const MQTT_BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://test.mosquitto.org:8081/mqtt',
];

interface SyncMessage {
  type: 'join' | 'ping' | 'leave' | 'sync' | 'update';
  senderId: string;
  targetId?: string; // If set, only the targeted recipient processes it
  timestamp: number;
  bill?: BillState;
}

class SyncEngine {
  private client: MqttClient | null = null;
  private currentRoomId: string | null = null;
  private currentTopic: string | null = null;
  private selfClientId: string;
  private peers: Map<string, number> = new Map(); // peerId -> lastSeen
  private heartbeatTimer: any = null;
  private peerCheckTimer: any = null;
  private latestLocalState: BillState | null = null;
  private callbacks: SyncEngineCallbacks | null = null;
  private brokerIndex: number = 0;
  private isWaitingInitialSync: boolean = false;

  constructor() {
    this.selfClientId = `fs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  public get roomId(): string | null {
    return this.currentRoomId;
  }

  public get peerCount(): number {
    return this.peers.size;
  }

  public join(roomId: string, currentState: BillState, callbacks: SyncEngineCallbacks): void {
    const cleanRoomId = roomId.trim().toUpperCase();
    if (this.currentRoomId === cleanRoomId && this.client?.connected) {
      this.latestLocalState = currentState;
      return;
    }

    this.leave();

    this.currentRoomId = cleanRoomId;
    this.currentTopic = `fairsplit/v2/rooms/${cleanRoomId}`;
    this.latestLocalState = currentState;
    this.callbacks = callbacks;
    this.peers.clear();
    // If local state has no modification timestamp or is 0, wait for room peers to sync to us
    this.isWaitingInitialSync = (currentState.lastModified || 0) === 0;

    this.connectBroker(this.brokerIndex);
  }

  private connectBroker(index: number): void {
    const brokerUrl = MQTT_BROKERS[index % MQTT_BROKERS.length];
    
    try {
      const client = mqtt.connect(brokerUrl, {
        clientId: this.selfClientId,
        clean: true,
        connectTimeout: 5000,
        reconnectPeriod: 3000,
      });

      this.client = client;

      client.on('connect', () => {
        if (!this.currentTopic) return;

        client.subscribe(this.currentTopic, { qos: 1 }, (err) => {
          if (!err) {
            // 1. If we already have valid active state, publish with retain so offline/future visitors get it immediately
            if (this.latestLocalState && (this.latestLocalState.lastModified || 0) > 0) {
              this.send({
                type: 'update',
                senderId: this.selfClientId,
                timestamp: this.latestLocalState.lastModified || Date.now(),
                bill: this.latestLocalState,
              }, true);
            }

            // 2. Announce join to the room
            this.send({
              type: 'join',
              senderId: this.selfClientId,
              timestamp: Date.now(),
            });

            // 3. Start heartbeat & peer cleanup timers
            this.startHeartbeat();
          }
        });
      });

      client.on('message', (_topic, messageBuffer) => {
        try {
          const raw = messageBuffer.toString();
          const msg = JSON.parse(raw) as SyncMessage;

          // Ignore self messages
          if (!msg || msg.senderId === this.selfClientId) return;

          this.handleIncomingMessage(msg);
        } catch (err) {
          console.warn('Failed to parse incoming sync message:', err);
        }
      });

      client.on('error', (err) => {
        console.warn(`MQTT connection error with broker ${brokerUrl}:`, err);
        this.callbacks?.onError?.(err);
      });

      // Handle broker disconnect/failover
      client.on('close', () => {
        // Will auto reconnect via reconnectPeriod
      });

    } catch (err: any) {
      console.warn('Failed to initialize MQTT sync:', err);
      this.callbacks?.onError?.(err);
    }
  }

  private handleIncomingMessage(msg: SyncMessage): void {
    const sender = msg.senderId;
    const now = Date.now();

    switch (msg.type) {
      case 'join': {
        this.peers.set(sender, now);
        this.notifyPeers();

        // When someone joins, if we have an active valid state (lastModified > 0),
        // send our current state targeted specifically to the newcomer so they sync up immediately
        if (this.latestLocalState && (this.latestLocalState.lastModified || 0) > 0) {
          this.send({
            type: 'sync',
            senderId: this.selfClientId,
            targetId: sender,
            timestamp: now,
            bill: this.latestLocalState,
          });
        }
        break;
      }

      case 'ping': {
        this.peers.set(sender, now);
        this.notifyPeers();
        break;
      }

      case 'leave': {
        this.peers.delete(sender);
        this.notifyPeers();
        break;
      }

      case 'sync': {
        this.peers.set(sender, now);
        this.notifyPeers();

        // If message is targeted to someone else, ignore it completely
        if (msg.targetId && msg.targetId !== this.selfClientId) {
          break;
        }

        if (msg.bill && Array.isArray(msg.bill.members) && Array.isArray(msg.bill.expenses)) {
          const incomingLastModified = msg.bill.lastModified || 0;
          const localLastModified = this.latestLocalState?.lastModified || 0;

          // Accept incoming state if we are waiting for initial sync or if incoming is newer
          if (this.isWaitingInitialSync || incomingLastModified > localLastModified) {
            this.isWaitingInitialSync = false;
            this.latestLocalState = msg.bill;
            this.callbacks?.onStateReceived(msg.bill);
          }
          // Note: We NEVER broadcast a reverse update on receiving sync!
        }
        break;
      }

      case 'update': {
        this.peers.set(sender, now);
        this.notifyPeers();

        if (msg.bill && Array.isArray(msg.bill.members) && Array.isArray(msg.bill.expenses)) {
          const incomingLastModified = msg.bill.lastModified || 0;
          const localLastModified = this.latestLocalState?.lastModified || 0;

          // Accept incoming update if we are waiting for initial sync or if incoming is newer
          if (this.isWaitingInitialSync || incomingLastModified > localLastModified) {
            this.isWaitingInitialSync = false;
            this.latestLocalState = msg.bill;
            this.callbacks?.onStateReceived(msg.bill);
          }
        }
        break;
      }
    }
  }

  public broadcast(state: BillState): void {
    this.latestLocalState = state;
    this.isWaitingInitialSync = false;
    if (this.client?.connected && this.currentTopic) {
      this.send({
        type: 'update',
        senderId: this.selfClientId,
        timestamp: Date.now(),
        bill: state,
      }, true); // Retain latest bill on broker
    }
  }

  private send(msg: SyncMessage, retain: boolean = false): void {
    if (!this.client?.connected || !this.currentTopic) return;
    try {
      this.client.publish(this.currentTopic, JSON.stringify(msg), { qos: 1, retain });
    } catch (e) {
      console.warn('Failed to publish sync message:', e);
    }
  }

  private startHeartbeat(): void {
    this.stopTimers();

    // Heartbeat every 5 seconds
    this.heartbeatTimer = setInterval(() => {
      // If we are still waiting for initial sync, re-announce join so peers can reply
      if (this.isWaitingInitialSync) {
        this.send({
          type: 'join',
          senderId: this.selfClientId,
          timestamp: Date.now(),
        });
      } else {
        this.send({
          type: 'ping',
          senderId: this.selfClientId,
          timestamp: Date.now(),
        });
      }
    }, 5000);

    // Check for timed out peers every 4 seconds (timeout after 12 seconds of inactivity)
    this.peerCheckTimer = setInterval(() => {
      const now = Date.now();
      let changed = false;

      for (const [peerId, lastSeen] of this.peers.entries()) {
        if (now - lastSeen > 12000) {
          this.peers.delete(peerId);
          changed = true;
        }
      }

      if (changed) {
        this.notifyPeers();
      }
    }, 4000);
  }

  private stopTimers(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.peerCheckTimer) {
      clearInterval(this.peerCheckTimer);
      this.peerCheckTimer = null;
    }
  }

  private notifyPeers(): void {
    this.callbacks?.onPeersChanged(this.peers.size);
  }

  public leave(): void {
    this.stopTimers();

    if (this.client?.connected && this.currentTopic) {
      this.send({
        type: 'leave',
        senderId: this.selfClientId,
        timestamp: Date.now(),
      });
      try {
        this.client.unsubscribe(this.currentTopic);
        this.client.end(true);
      } catch {
        // Ignore end errors
      }
    }

    this.client = null;
    this.currentRoomId = null;
    this.currentTopic = null;
    this.peers.clear();
    this.isWaitingInitialSync = false;
    this.callbacks?.onPeersChanged(0);
  }
}

export const syncEngine = new SyncEngine();
