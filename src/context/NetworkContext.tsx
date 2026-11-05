import React, { createContext, useContext, useState, useEffect } from 'react';
import { disableNetwork, enableNetwork, waitForPendingWrites } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface NetworkContextType {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  effectiveOffline: boolean;
  toggleSimulateOffline: () => void;
  pendingSyncCount: number;
  incrementPending: () => void;
  decrementPending: () => void;
  setPendingCount: (count: number) => void;
  syncNow: () => Promise<void>;
  isSyncing: boolean;
  syncFeedback: string | null;
  syncStatus: 'synced' | 'syncing' | 'saved_on_device';
}

const NetworkContext = createContext<NetworkContextType | null>(null);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('swasthasetu_simulate_offline') === 'true';
    }
    return false;
  });
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      if (!isSimulatedOffline) {
        try {
          await enableNetwork(db);
        } catch (e) {
          console.warn('[Network] enableNetwork error:', e);
        }
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isSimulatedOffline]);

  const toggleSimulateOffline = async () => {
    const nextState = !isSimulatedOffline;
    setIsSimulatedOffline(nextState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('swasthasetu_simulate_offline', String(nextState));
    }
    try {
      if (nextState) {
        await disableNetwork(db);
        console.log('[Network] Firestore simulated offline (network disabled)');
      } else {
        await enableNetwork(db);
        console.log('[Network] Firestore simulated offline restored (network enabled)');
      }
    } catch (e) {
      console.warn('[Network] Error toggling Firestore network mode:', e);
    }
  };

  const syncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      if (!effectiveOffline) {
        await enableNetwork(db);
        await waitForPendingWrites(db);
        setPendingSyncCount(0);
        setSyncFeedback('All local changes synchronized to cloud.');
      } else {
        setSyncFeedback('Device is offline. Changes remain saved securely on this device.');
      }
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch (err: any) {
      setSyncFeedback('Sync failed. Records remain safely stored locally.');
      setTimeout(() => setSyncFeedback(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  const incrementPending = () => setPendingSyncCount((c) => c + 1);
  const decrementPending = () => setPendingSyncCount((c) => Math.max(0, c - 1));
  const setPendingCount = (count: number) => setPendingSyncCount(count);

  const effectiveOffline = !isOnline || isSimulatedOffline;

  const syncStatus: 'synced' | 'syncing' | 'saved_on_device' = isSyncing
    ? 'syncing'
    : effectiveOffline || pendingSyncCount > 0
    ? 'saved_on_device'
    : 'synced';

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        isSimulatedOffline,
        effectiveOffline,
        toggleSimulateOffline,
        pendingSyncCount,
        incrementPending,
        decrementPending,
        setPendingCount,
        syncNow,
        isSyncing,
        syncFeedback,
        syncStatus,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error('useNetwork must be used within NetworkProvider');
  return ctx;
}
