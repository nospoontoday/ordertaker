import { useState, useEffect } from 'react';
import { syncManager, SyncStatus } from '@/lib/sync-manager';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | undefined>();
  const [syncError, setSyncError] = useState<string | undefined>();

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    // Subscribe to sync status updates
    const unsubscribe = syncManager.subscribe((status: SyncStatus) => {
      setIsOnline(status.status === 'online');
      setIsSyncing(status.syncing);
      setLastSync(status.lastSync);
      setSyncError(status.error);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const forceSync = async () => {
    return syncManager.forceSync();
  };

  return {
    isOnline,
    isOffline: !isOnline,
    isSyncing,
    lastSync,
    syncError,
    forceSync,
  };
}
