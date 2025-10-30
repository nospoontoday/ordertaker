// Sync manager for synchronizing offline data with server

import { orderDB, Order } from './db';

export class SyncManager {
  private syncing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      // Listen for online/offline events
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());

      // Listen for service worker messages
      navigator.serviceWorker?.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_ORDERS') {
          this.sync();
        }
      });

      // Start periodic sync if online
      if (navigator.onLine) {
        this.startPeriodicSync();
      }
    }
  }

  private handleOnline() {
    console.log('Connection restored, initiating sync...');
    this.notifyListeners({ status: 'online', syncing: false });
    this.sync();
    this.startPeriodicSync();
  }

  private handleOffline() {
    console.log('Connection lost, entering offline mode...');
    this.notifyListeners({ status: 'offline', syncing: false });
    this.stopPeriodicSync();
  }

  private startPeriodicSync() {
    // Sync every 30 seconds when online
    if (!this.syncInterval) {
      this.syncInterval = setInterval(() => this.sync(), 30000);
    }
  }

  private stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async sync(): Promise<boolean> {
    if (this.syncing || !navigator.onLine) {
      return false;
    }

    this.syncing = true;
    this.notifyListeners({ status: 'online', syncing: true });

    try {
      // Get unsynced orders
      const unsyncedOrders = await orderDB.getUnsyncedOrders();

      if (unsyncedOrders.length === 0) {
        console.log('No orders to sync');
        this.syncing = false;
        this.notifyListeners({ status: 'online', syncing: false });
        return true;
      }

      console.log(`Syncing ${unsyncedOrders.length} orders...`);

      // Sync each order to the server
      for (const order of unsyncedOrders) {
        await this.syncOrder(order);
      }

      // Fetch any updates from server
      await this.fetchServerUpdates();

      console.log('Sync completed successfully');
      this.syncing = false;
      this.notifyListeners({ status: 'online', syncing: false, lastSync: Date.now() });
      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      this.syncing = false;
      this.notifyListeners({ status: 'online', syncing: false, error: String(error) });
      return false;
    }
  }

  private async syncOrder(order: Order): Promise<void> {
    try {
      // Send order to server
      const response = await fetch('/api/orders/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(order),
      });

      if (response.ok) {
        // Mark as synced
        await orderDB.markOrderSynced(order.id);
        console.log(`Order ${order.id} synced successfully`);
      } else {
        console.error(`Failed to sync order ${order.id}:`, response.statusText);
      }
    } catch (error) {
      console.error(`Error syncing order ${order.id}:`, error);
      // Don't throw - continue with other orders
    }
  }

  private async fetchServerUpdates(): Promise<void> {
    try {
      // Get latest timestamp from local DB
      const allOrders = await orderDB.getAllOrders();
      const latestTimestamp = allOrders.reduce((max, order) =>
        Math.max(max, order.lastModified || order.createdAt), 0
      );

      // Fetch updates from server
      const response = await fetch(`/api/orders/updates?since=${latestTimestamp}`);

      if (response.ok) {
        const updates: any[] = await response.json();

        if (updates.length > 0) {
          // Merge server updates with local data
          for (const serverOrder of updates) {
            const localOrder = await orderDB.getOrder(serverOrder.id);

            // Use updatedAt from MongoDB or createdAt
            const serverTimestamp = serverOrder.updatedAt || serverOrder.createdAt;
            const localTimestamp = localOrder?.lastModified || localOrder?.createdAt || 0;

            // Server wins in conflicts (you can implement more sophisticated logic)
            if (!localOrder || serverTimestamp > localTimestamp) {
              await orderDB.saveOrder({
                ...serverOrder,
                lastModified: serverTimestamp,
                synced: true
              });
            }
          }
          console.log(`Fetched ${updates.length} updates from server`);
        }
      }
    } catch (error) {
      console.error('Error fetching server updates:', error);
      // Don't throw - this is not critical
    }
  }

  // Subscribe to sync status changes
  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);

    // Send initial status
    listener({
      status: navigator.onLine ? 'online' : 'offline',
      syncing: this.syncing,
    });

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(status: SyncStatus) {
    this.listeners.forEach(listener => listener(status));
  }

  // Force sync
  async forceSync(): Promise<boolean> {
    return this.sync();
  }

  // Register background sync (if supported)
  async registerBackgroundSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('sync-orders');
        console.log('Background sync registered');
      } catch (error) {
        console.error('Failed to register background sync:', error);
      }
    }
  }

  destroy() {
    this.stopPeriodicSync();
    this.listeners.clear();
    window.removeEventListener('online', () => this.handleOnline());
    window.removeEventListener('offline', () => this.handleOffline());
  }
}

export interface SyncStatus {
  status: 'online' | 'offline';
  syncing: boolean;
  lastSync?: number;
  error?: string;
}

// Export singleton instance
export const syncManager = new SyncManager();
