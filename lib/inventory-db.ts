// IndexedDB manager for inventory
const DB_NAME = "InventoryDB"
const DB_VERSION = 1
const STORE_NAME = "inventory"

export interface InventoryItem {
  id: string
  name: string
  quantity: number
  unit: string // e.g., "pcs", "kg", "liters", "boxes"
  category: string
  lowStockThreshold: number
  lastUpdated: number
  notes?: string
}

class InventoryDB {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create inventory store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" })
          store.createIndex("category", "category", { unique: false })
          store.createIndex("lastUpdated", "lastUpdated", { unique: false })
        }
      }
    })
  }

  async getAllItems(): Promise<InventoryItem[]> {
    await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async getItem(id: string): Promise<InventoryItem | null> {
    await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async saveItem(item: InventoryItem): Promise<void> {
    await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(item)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async deleteItem(id: string): Promise<void> {
    await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async saveAllItems(items: InventoryItem[]): Promise<void> {
    await this.ensureDB()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite")
      const store = transaction.objectStore(STORE_NAME)

      // Clear existing items first
      const clearRequest = store.clear()
      clearRequest.onsuccess = () => {
        // Add all new items
        items.forEach((item) => {
          store.put(item)
        })
      }

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  private async ensureDB(): Promise<void> {
    if (!this.db) {
      await this.init()
    }
  }
}

export const inventoryDB = new InventoryDB()
