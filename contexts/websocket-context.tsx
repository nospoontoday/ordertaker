"use client"

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import type { Order } from '@/lib/api'

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

// Custom hook for order events
export function useOrderEvents(
  onOrderCreated?: (order: Order) => void,
  onOrderUpdated?: (order: Order) => void,
  onOrderDeleted?: (orderId: string) => void
) {
  const { socket, isConnected } = useWebSocket()

  useEffect(() => {
    if (!socket) return

    // Listen for order events
    if (onOrderCreated) {
      socket.on('order:created', onOrderCreated)
    }

    if (onOrderUpdated) {
      socket.on('order:updated', onOrderUpdated)
    }

    if (onOrderDeleted) {
      socket.on('order:deleted', onOrderDeleted)
    }

    // Cleanup listeners on unmount
    return () => {
      if (onOrderCreated) {
        socket.off('order:created', onOrderCreated)
      }
      if (onOrderUpdated) {
        socket.off('order:updated', onOrderUpdated)
      }
      if (onOrderDeleted) {
        socket.off('order:deleted', onOrderDeleted)
      }
    }
  }, [socket, onOrderCreated, onOrderUpdated, onOrderDeleted])

  return { isConnected }
}
