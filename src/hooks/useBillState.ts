import { useState, useEffect, useCallback, useRef } from 'react';
import { BillState, Member, Expense, SettlementOptions } from '../types';
import { parseHash } from '../utils/urlState';
import { syncEngine } from '../utils/syncEngine';

const STORAGE_KEY = 'fairsplit_active_bill_v1';
const THEME_KEY = 'fairsplit_theme';

const DEFAULT_BILL: BillState = {
  title: '週末聚會分帳',
  members: [
    { id: 'm_1', name: '小明' },
    { id: 'm_2', name: '小華' },
    { id: 'm_3', name: '阿美' },
  ],
  expenses: [
    {
      id: 'e_1',
      title: '晚餐火鍋',
      date: new Date().toISOString().split('T')[0],
      totalAmount: 1800,
      payers: [{ memberId: 'm_1', amount: 1800 }],
      splitType: 'equal_all',
      shares: [],
      category: '餐飲',
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now() - 3600000,
    },
    {
      id: 'e_2',
      title: '手搖飲料',
      date: new Date().toISOString().split('T')[0],
      totalAmount: 240,
      payers: [{ memberId: 'm_2', amount: 240 }],
      splitType: 'equal_selected',
      shares: [{ memberId: 'm_2' }, { memberId: 'm_3' }],
      category: '飲品',
      createdAt: Date.now() - 1800000,
      updatedAt: Date.now() - 1800000,
    }
  ],
  options: {
    currency: 'TWD',
    roundToInteger: true,
  },
  lastModified: 0, // Initial unedited default must be 0 so it never overwrites real bills
};

export function useBillState() {
  const [bill, setBill] = useState<BillState>(() => {
    // 1. First check URL hash
    if (typeof window !== 'undefined') {
      const parsed = parseHash(window.location.hash);
      if (parsed?.type === 'data') {
        return parsed.bill;
      }
      if (parsed?.type === 'room') {
        const targetRoom = parsed.roomId.trim().toUpperCase();
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsedSaved = JSON.parse(saved);
            if (parsedSaved?.roomId === targetRoom && Array.isArray(parsedSaved.members) && (parsedSaved.lastModified || 0) > 0) {
              return parsedSaved;
            }
          }
        } catch {
          // ignore
        }

        return {
          title: '同步房間中...',
          members: [],
          expenses: [],
          options: { currency: 'TWD', roundToInteger: true },
          roomId: targetRoom,
          lastModified: 0,
        };
      }
      
      // 2. LocalStorage fallback
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsedSaved = JSON.parse(saved);
          if (parsedSaved && Array.isArray(parsedSaved.members)) {
            return parsedSaved;
          }
        }
      } catch (e) {
        console.warn('Failed to read from localStorage:', e);
      }
    }
    return DEFAULT_BILL;
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    }
    return 'dark'; // Default dark mode per user choice
  });

  const [peerCount, setPeerCount] = useState<number>(0);
  const billRef = useRef(bill);
  billRef.current = bill;

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Ignore
    }
  }, [theme]);

  // Save to LocalStorage whenever bill changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bill));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }, [bill]);

  // Helper to commit local changes and broadcast to peers
  const updateBill = useCallback((updater: (prev: BillState) => BillState) => {
    setBill(prev => {
      const next = updater(prev);
      const withTimestamp: BillState = {
        ...next,
        title: next.title === '同步房間中...' ? '新分帳活動' : next.title,
        lastModified: Date.now(),
      };
      billRef.current = withTimestamp;
      // Broadcast to connected peers
      if (withTimestamp.roomId) {
        syncEngine.broadcast(withTimestamp);
      }
      return withTimestamp;
    });
  }, []);

  // Handle incoming remote state from peers
  const handleRemoteState = useCallback((remoteState: BillState) => {
    setBill(prev => {
      const incomingLastModified = remoteState.lastModified || 0;
      const localLastModified = prev.lastModified || 0;

      // Accept if incoming is newer or if we have uninitialized state
      if (localLastModified === 0 || incomingLastModified >= localLastModified) {
        billRef.current = remoteState;
        return remoteState;
      }
      return prev;
    });
  }, []);

  // Connect or disconnect room
  const joinRoom = useCallback((roomId: string, isNewRoom: boolean = false) => {
    const cleanRoomId = roomId.trim().toUpperCase();
    if (!cleanRoomId) return;

    let targetBill: BillState;
    const current = billRef.current;

    if (isNewRoom) {
      // Creating a new room: retain current bill and ensure lastModified > 0
      targetBill = {
        ...current,
        roomId: cleanRoomId,
        lastModified: current.lastModified || Date.now(),
      };
    } else {
      // Joining an existing room:
      // If we already have this room loaded with valid edits:
      if (current.roomId === cleanRoomId && (current.lastModified || 0) > 0) {
        targetBill = current;
      } else {
        let existingRoomBill: BillState | null = null;
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed?.roomId === cleanRoomId && Array.isArray(parsed.members) && (parsed.lastModified || 0) > 0) {
              existingRoomBill = parsed;
            }
          }
        } catch {
          // ignore
        }

        if (existingRoomBill) {
          targetBill = existingRoomBill;
        } else {
          targetBill = {
            title: '同步房間中...',
            members: [],
            expenses: [],
            options: current.options || { currency: 'TWD', roundToInteger: true },
            roomId: cleanRoomId,
            lastModified: 0,
          };
        }
      }
    }

    billRef.current = targetBill;
    setBill(targetBill);

    syncEngine.join(cleanRoomId, targetBill, {
      onStateReceived: handleRemoteState,
      onPeersChanged: setPeerCount,
    });

    // Update URL hash without reload
    window.history.replaceState(null, '', `#room=${encodeURIComponent(cleanRoomId)}`);
  }, [handleRemoteState]);

  const leaveRoom = useCallback(() => {
    syncEngine.leave();
    setPeerCount(0);
    setBill(prev => {
      const { roomId: _discard, ...rest } = prev;
      const updated = rest as BillState;
      billRef.current = updated;
      return updated;
    });
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  // Listen to initial URL room hash
  useEffect(() => {
    const parsed = parseHash(window.location.hash);
    if (parsed?.type === 'room') {
      joinRoom(parsed.roomId, false);
    } else if (billRef.current.roomId) {
      // Reconnect room if saved in state
      joinRoom(billRef.current.roomId, false);
    }

    const handleHashChange = () => {
      const p = parseHash(window.location.hash);
      if (p?.type === 'room' && p.roomId !== billRef.current.roomId) {
        joinRoom(p.roomId, false);
      } else if (p?.type === 'data') {
        billRef.current = p.bill;
        setBill(p.bill);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [joinRoom]);

  // Mutations
  const setTitle = useCallback((title: string) => {
    updateBill(prev => ({ ...prev, title }));
  }, [updateBill]);

  const addMember = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newMember: Member = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
    };
    updateBill(prev => ({
      ...prev,
      members: [...prev.members, newMember],
    }));
  }, [updateBill]);

  const removeMember = useCallback((id: string) => {
    updateBill(prev => ({
      ...prev,
      members: prev.members.filter(m => m.id !== id),
      // Clean up member from expenses
      expenses: prev.expenses.map(e => ({
        ...e,
        payers: e.payers.filter(p => p.memberId !== id),
        shares: e.shares.filter(s => s.memberId !== id),
      })).filter(e => e.payers.length > 0), // Remove expenses without any payers
    }));
  }, [updateBill]);

  const updateMember = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    updateBill(prev => ({
      ...prev,
      members: prev.members.map(m => (m.id === id ? { ...m, name: trimmed } : m)),
    }));
  }, [updateBill]);

  const addExpense = useCallback((expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    const newExpense: Expense = {
      ...expenseData,
      id: `e_${now}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    };
    updateBill(prev => ({
      ...prev,
      expenses: [newExpense, ...prev.expenses],
    }));
  }, [updateBill]);

  const updateExpense = useCallback((id: string, expenseData: Partial<Expense>) => {
    updateBill(prev => ({
      ...prev,
      expenses: prev.expenses.map(e =>
        e.id === id ? { ...e, ...expenseData, updatedAt: Date.now() } : e
      ),
    }));
  }, [updateBill]);

  const deleteExpense = useCallback((id: string) => {
    updateBill(prev => ({
      ...prev,
      expenses: prev.expenses.filter(e => e.id !== id),
    }));
  }, [updateBill]);

  const setOptions = useCallback((opts: Partial<SettlementOptions>) => {
    updateBill(prev => ({
      ...prev,
      options: { ...prev.options, ...opts },
    }));
  }, [updateBill]);

  const resetBill = useCallback(() => {
    const fresh: BillState = {
      title: '新分帳活動',
      members: [],
      expenses: [],
      options: billRef.current.options,
      lastModified: Date.now(),
    };
    updateBill(() => fresh);
    window.history.replaceState(null, '', window.location.pathname);
  }, [updateBill]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return {
    bill,
    theme,
    peerCount,
    isLive: Boolean(bill.roomId),
    setTitle,
    addMember,
    removeMember,
    updateMember,
    addExpense,
    updateExpense,
    deleteExpense,
    setOptions,
    resetBill,
    joinRoom,
    leaveRoom,
    toggleTheme,
  };
}
