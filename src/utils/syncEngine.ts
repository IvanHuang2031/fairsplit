import { joinRoom, Room } from 'trystero/torrent';
import { BillState } from '../types';

export interface SyncEngineCallbacks {
  onStateReceived: (state: BillState) => void;
  onPeersChanged: (count: number) => void;
  onError?: (err: Error) => void;
}

class SyncEngine {
  private currentRoom: Room | null = null;
  private currentRoomId: string | null = null;
  private connectedPeers: Set<string> = new Set();
  private sendStateAction: ((data: string, targetPeerId?: string) => void) | null = null;
  private latestLocalState: BillState | null = null;
  private callbacks: SyncEngineCallbacks | null = null;

  public get roomId(): string | null {
    return this.currentRoomId;
  }

  public get peerCount(): number {
    return this.connectedPeers.size;
  }

  public join(roomId: string, currentState: BillState, callbacks: SyncEngineCallbacks): void {
    if (this.currentRoomId === roomId && this.currentRoom) {
      this.latestLocalState = currentState;
      return;
    }

    this.leave();

    this.currentRoomId = roomId;
    this.latestLocalState = currentState;
    this.callbacks = callbacks;
    this.connectedPeers.clear();

    try {
      const room = joinRoom({ appId: 'fairsplit-v1' }, roomId);
      this.currentRoom = room;

      const [sendState, onGetState] = room.makeAction<string>('billSync');
      this.sendStateAction = sendState;

      onGetState((rawJson, peerId) => {
        try {
          const incomingState = JSON.parse(rawJson) as BillState;
          if (!incomingState || !incomingState.members || !incomingState.expenses) return;

          // Compare timestamps: accept incoming state if it's newer
          if (!this.latestLocalState || incomingState.lastModified > (this.latestLocalState.lastModified || 0)) {
            this.latestLocalState = incomingState;
            this.callbacks?.onStateReceived(incomingState);
          } else if (this.latestLocalState && this.latestLocalState.lastModified > (incomingState.lastModified || 0)) {
            // Send our newer state specifically back to the outdated peer
            sendState(JSON.stringify(this.latestLocalState), peerId);
          }
        } catch (e) {
          console.warn('Failed to parse incoming sync state:', e);
        }
      });

      room.onPeerJoin(peerId => {
        this.connectedPeers.add(peerId);
        this.callbacks?.onPeersChanged(this.connectedPeers.size);

        // When a new peer arrives, share our current state so they catch up instantly
        if (this.latestLocalState && this.sendStateAction) {
          this.sendStateAction(JSON.stringify(this.latestLocalState), peerId);
        }
      });

      room.onPeerLeave(peerId => {
        this.connectedPeers.delete(peerId);
        this.callbacks?.onPeersChanged(this.connectedPeers.size);
      });
    } catch (err: any) {
      console.warn('WebRTC P2P Sync failed to initialize:', err);
      this.callbacks?.onError?.(err);
    }
  }

  public broadcast(state: BillState): void {
    this.latestLocalState = state;
    if (this.sendStateAction && this.connectedPeers.size > 0) {
      try {
        this.sendStateAction(JSON.stringify(state));
      } catch (err) {
        console.warn('Failed to broadcast state:', err);
      }
    }
  }

  public leave(): void {
    if (this.currentRoom) {
      try {
        this.currentRoom.leave();
      } catch (e) {
        // Ignore leave errors
      }
      this.currentRoom = null;
    }
    this.currentRoomId = null;
    this.connectedPeers.clear();
    this.sendStateAction = null;
    this.callbacks?.onPeersChanged(0);
  }
}

export const syncEngine = new SyncEngine();
