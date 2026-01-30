// IndexedDB wrapper for offline data storage

const DB_NAME = 'OrderTakerDB';
const DB_VERSION = 1;

export interface Order {
  id: string;
  customerName: string;
  items: OrderItem[];
  createdAt: number;
  isPaid: boolean;
  appendedOrders?: AppendedOrder[];
  synced?: boolean; // Track if synced to server
  lastModified?: number; // Track last modification
  paymentMethod?: "cash" | "gcash" | "split";
  paidAmount?: number;
  amountReceived?: number; // Amount received from customer
  cashAmount?: number; // For split payments
  gcashAmount?: number; // For split payments
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  status: "pending" | "preparing" | "ready" | "served";
  image?: string;
}

export interface AppendedOrder {
  id: string;
  items: OrderItem[];
  createdAt: number;
  isPaid?: boolean;
  paymentMethod?: "cash" | "gcash" | "split";
  paidAmount?: number;
  amountReceived?: number; // Amount received from customer
  cashAmount?: number; // For split payments
  gcashAmount?: number; // For split payments
}

class OrderDB {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.initDB();
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('IndexedDB not available'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create orders store
        if (!db.objectStoreNames.contains('orders')) {
          const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
          orderStore.createIndex('synced', 'synced', { unique: false });
          orderStore.createIndex('createdAt', 'createdAt', { unique: false });
          orderStore.createIndex('lastModified', 'lastModified', { unique: false });
        }

        // Create sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async ensureDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return this.dbPromise;
  }

  // Get all orders
  async getAllOrders(): Promise<Order[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['orders'], 'readonly');
      const store = transaction.objectStore('orders');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Get single order
  async getOrder(id: string): Promise<Order | undefined> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['orders'], 'readonly');
      const store = transaction.objectStore('orders');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Save order (create or update)
  async saveOrder(order: Order): Promise<void> {
    const db = await this.ensureDB();
    const orderWithMeta = {
      ...order,
      lastModified: Date.now(),
      synced: false, // Mark as unsynced when modified
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['orders'], 'readwrite');
      const store = transaction.objectStore('orders');
      const request = store.put(orderWithMeta);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Save multiple orders
  async saveOrders(orders: Order[]): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['orders'], 'readwrite');
      const store = transaction.objectStore('orders');

      orders.forEach(order => {
        const orderWithMeta = {
          ...order,
          lastModified: Date.now(),
          synced: order.synced ?? false,
        };
        store.put(orderWithMeta);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Delete order
  async deleteOrder(id: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['orders'], 'readwrite');
      const store = transaction.objectStore('orders');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get unsynced orders
  async getUnsyncedOrders(): Promise<Order[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['orders'], 'readonly');
      const store = transaction.objectStore('orders');
      const request = store.getAll();

      request.onsuccess = () => {
        // Filter for unsynced orders (synced === false or synced is undefined)
        const allOrders = request.result || [];
        const unsyncedOrders = allOrders.filter(order => !order.synced);
        resolve(unsyncedOrders);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Mark order as synced
  async markOrderSynced(id: string): Promise<void> {
    const order = await this.getOrder(id);
    if (order) {
      await this.saveOrder({ ...order, synced: true });
    }
  }

  // Add to sync queue
  async addToSyncQueue(action: string, data: any): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.add({
        action,
        data,
        timestamp: Date.now(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get sync queue
  async getSyncQueue(): Promise<any[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Clear sync queue
  async clearSyncQueue(): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Migrate from localStorage to IndexedDB
  async migrateFromLocalStorage(): Promise<void> {
    if (typeof window === 'undefined') return;

    const localStorageData = localStorage.getItem('orders');
    if (localStorageData) {
      try {
        const orders: Order[] = JSON.parse(localStorageData);
        await this.saveOrders(orders.map(order => ({ ...order, synced: false })));
        console.log('Migrated orders from localStorage to IndexedDB');
      } catch (error) {
        console.error('Failed to migrate from localStorage:', error);
      }
    }
  }
}

// Export singleton instance
export const orderDB = new OrderDB();

// Initialize migration on module load
if (typeof window !== 'undefined') {
  orderDB.migrateFromLocalStorage().catch(console.error);
}
