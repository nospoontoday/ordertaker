# Offline Mode Documentation

## Overview

The Order Taker POS app now features comprehensive offline functionality, allowing uninterrupted operation even without internet connectivity. All data is stored locally and automatically syncs with the server when connection is restored.

## Features

### 1. **Service Worker Caching**
- Caches critical app assets (HTML, CSS, JS, images)
- Implements network-first strategy for API calls with cache fallback
- Automatically updates cached resources when new versions are available

### 2. **IndexedDB Storage**
- Replaces localStorage with robust IndexedDB for data persistence
- Stores orders, transactions, and all POS data locally
- Supports large datasets without browser storage limitations
- Tracks sync status for each order

### 3. **Automatic Sync**
- Syncs unsynced orders when connection is restored
- Background sync registration (when supported)
- Periodic sync every 30 seconds when online
- Conflict resolution (server wins by default)

### 4. **Offline UI Indicators**
- Yellow banner at top when offline or syncing
- Shows last sync timestamp
- Manual sync button
- Visual feedback for sync status

### 5. **Progressive Web App (PWA)**
- Installable on desktop and mobile devices
- App manifest with proper icons and metadata
- Standalone app experience
- Shortcuts for quick access to Order Taker and Crew Dashboard

## Technical Architecture

### Files Created/Modified

#### Core Infrastructure
- `public/service-worker.js` - Service worker for offline caching
- `lib/db.ts` - IndexedDB wrapper for data storage
- `lib/sync-manager.ts` - Synchronization manager
- `lib/register-sw.ts` - Service worker registration utility

#### UI Components
- `components/offline-indicator.tsx` - Visual offline status indicator
- `components/sw-initializer.tsx` - Service worker initialization component
- `hooks/use-offline.ts` - React hook for offline state
- `hooks/use-orders.ts` - React hook for order management with IndexedDB

#### PWA Assets
- `public/manifest.json` - PWA manifest
- `app/offline/page.tsx` - Offline fallback page

#### Backend API
- `backend/routes/orders.js` - Added `/sync` and `/updates` endpoints

#### Modified Components
- `app/layout.tsx` - Added service worker and manifest
- `app/page.tsx` - Added offline indicator
- `components/crew-dashboard.tsx` - Updated to use IndexedDB
- `components/order-taker.tsx` - Updated to use IndexedDB

## Usage

### For Users

1. **Normal Operation**: The app works exactly as before when online
2. **Going Offline**: App continues to function, yellow banner appears
3. **Taking Orders Offline**: Orders are saved locally in IndexedDB
4. **Coming Back Online**: All offline changes sync automatically

### For Developers

#### Accessing IndexedDB
```typescript
import { orderDB } from '@/lib/db';

// Get all orders
const orders = await orderDB.getAllOrders();

// Save order
await orderDB.saveOrder(order);

// Get unsynced orders
const unsynced = await orderDB.getUnsyncedOrders();
```

#### Using the Offline Hook
```typescript
import { useOffline } from '@/hooks/use-offline';

function MyComponent() {
  const { isOnline, isOffline, isSyncing, lastSync, forceSync } = useOffline();

  return (
    <div>
      {isOffline && <div>You are offline</div>}
      <button onClick={forceSync}>Sync Now</button>
    </div>
  );
}
```

#### Manual Sync
```typescript
import { syncManager } from '@/lib/sync-manager';

// Force sync
await syncManager.forceSync();

// Subscribe to sync status
const unsubscribe = syncManager.subscribe((status) => {
  console.log('Sync status:', status);
});
```

## API Endpoints

### POST /api/orders/sync
Sync a single order from offline device to server.

**Request Body:**
```json
{
  "id": "order-123",
  "customerName": "John Doe",
  "items": [...],
  "createdAt": 1234567890,
  "synced": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order synced successfully",
  "order": {...}
}
```

### GET /api/orders/updates?since={timestamp}
Get orders updated since a specific timestamp.

**Query Parameters:**
- `since`: Unix timestamp (milliseconds)

**Response:**
```json
[
  {
    "id": "order-123",
    "customerName": "John Doe",
    ...
  }
]
```

## Sync Logic

1. **On Network Restore:**
   - Detect online event
   - Get all unsynced orders from IndexedDB
   - Send each order to `/api/orders/sync`
   - Mark successfully synced orders
   - Fetch server updates via `/api/orders/updates`

2. **Periodic Sync:**
   - Runs every 30 seconds when online
   - Same process as network restore

3. **Conflict Resolution:**
   - Server timestamp compared with local timestamp
   - Server wins by default (can be customized)
   - Uses `updatedAt` from MongoDB or `lastModified`

## Testing Offline Mode

### Chrome DevTools
1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Select "Offline" from throttling dropdown
4. Test creating orders, updating items, etc.
5. Switch back to "Online" to see sync happen

### Application Tab
1. Go to Application tab in DevTools
2. View Service Workers registration
3. Inspect IndexedDB → OrderTakerDB → orders
4. Check Cache Storage for cached assets

## Browser Support

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (iOS 11.3+)
- **Mobile Browsers**: Full support on modern browsers

## Installation as PWA

### Desktop
1. Chrome: Click install icon in address bar
2. Edge: Click "App available" prompt

### Mobile
1. iOS Safari: Tap Share → Add to Home Screen
2. Android Chrome: Tap menu → Install app

## Troubleshooting

### Orders not syncing
1. Check browser console for errors
2. Verify network connectivity
3. Check IndexedDB for unsynced orders
4. Try manual sync via force sync button

### Service Worker not registering
1. Ensure HTTPS (required for service workers)
2. Check `/service-worker.js` is accessible
3. Check browser console for registration errors

### IndexedDB not working
1. Check browser support (all modern browsers)
2. Ensure sufficient storage space
3. Check browser privacy settings (private mode may limit)

## Future Enhancements

- [ ] Background sync API for better offline support
- [ ] Conflict resolution UI for manual resolution
- [ ] Optimistic UI updates with rollback
- [ ] Offline indicators for individual orders
- [ ] Export/import for backup/restore
- [ ] Push notifications for sync completion
