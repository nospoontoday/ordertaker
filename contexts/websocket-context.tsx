"use client"

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import type { Order } from '@/lib/api'
import type { BranchId } from '@/lib/branches'

interface WebSocketContextType {
  socket: Socket | null
  isConnected: boolean
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
})

export const useWebSocket = () => useContext(WebSocketContext)

interface WebSocketProviderProps {
  children: React.ReactNode
}

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    // Initialize Socket.io connection
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socketRef.current = newSocket
    setSocket(newSocket)

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('✓ WebSocket connected:', newSocket.id)
      setIsConnected(true)
    })

    newSocket.on('disconnect', (reason) => {
      console.log('✗ WebSocket disconnected:', reason)
      setIsConnected(false)
    })

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      setIsConnected(false)
    })

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up WebSocket connection')
      newSocket.close()
    }
  }, [])

  return (
    <WebSocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  )
}

// Custom hook for order events with branch filtering
export function useOrderEvents(
  onOrderCreated?: (order: Order) => void,
  onOrderUpdated?: (order: Order) => void,
  onOrderDeleted?: (orderId: string) => void,
  branchId?: BranchId
) {
  const { socket, isConnected } = useWebSocket()

  // Create filtered handlers that only call callbacks for matching branch
  const handleOrderCreated = useCallback((order: Order & { branchId?: string }) => {
    // If branchId filter is set and order has a different branchId, ignore
    if (branchId && order.branchId && order.branchId !== branchId) {
      return
    }
    onOrderCreated?.(order)
  }, [onOrderCreated, branchId])

  const handleOrderUpdated = useCallback((order: Order & { branchId?: string }) => {
    // If branchId filter is set and order has a different branchId, ignore
    if (branchId && order.branchId && order.branchId !== branchId) {
      return
    }
    onOrderUpdated?.(order)
  }, [onOrderUpdated, branchId])

  useEffect(() => {
    if (!socket) return

    // Listen for order events with branch filtering
    socket.on('order:created', handleOrderCreated)
    socket.on('order:updated', handleOrderUpdated)

    if (onOrderDeleted) {
      // Note: For deletions, we don't have branchId info in the event
      // The component should handle filtering based on its local state
      socket.on('order:deleted', onOrderDeleted)
    }

    // Cleanup listeners on unmount
    return () => {
      socket.off('order:created', handleOrderCreated)
      socket.off('order:updated', handleOrderUpdated)
      if (onOrderDeleted) {
        socket.off('order:deleted', onOrderDeleted)
      }
    }
  }, [socket, handleOrderCreated, handleOrderUpdated, onOrderDeleted])

  return { isConnected }
}
