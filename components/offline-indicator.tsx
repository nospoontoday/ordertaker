"use client"

import { useOffline } from '@/hooks/use-offline'
import { WifiOff, Wifi, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function OfflineIndicator() {
  const { isOffline, isSyncing, lastSync, forceSync } = useOffline()

  if (!isOffline && !isSyncing) {
    return null
  }

  const formatLastSync = (timestamp?: number) => {
    if (!timestamp) return 'Never'
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    return `${Math.floor(seconds / 3600)}h ago`
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-950 px-4 py-2 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-2">
        {isOffline ? (
          <>
            <WifiOff className="h-5 w-5" />
            <span className="font-medium">Offline Mode</span>
            <span className="text-sm opacity-80">
              - Changes will sync when reconnected
            </span>
          </>
        ) : (
          <>
            <Wifi className="h-5 w-5" />
            <span className="font-medium">Syncing...</span>
          </>
        )}
      </div>

      {!isOffline && (
        <div className="flex items-center gap-3">
          <span className="text-sm opacity-80">
            Last sync: {formatLastSync(lastSync)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={forceSync}
            disabled={isSyncing}
            className="text-yellow-950 hover:bg-yellow-600 hover:text-yellow-950"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      )}
    </div>
  )
}
