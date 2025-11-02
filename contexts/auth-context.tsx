"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

interface User {
  id: string
  email: string
  role: "super_admin" | "order_taker" | "crew" | "order_taker_crew"
  name: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string, role: "order_taker" | "crew" | "order_taker_crew", name?: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  changePassword: (email: string, currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
const CURRENT_USER_KEY = "ordertaker_current_user"

// Helper to determine if we should use credentials
// Some mobile browsers block credentials with HTTP (non-HTTPS) requests
const shouldUseCredentials = () => {
  if (typeof window === 'undefined') return true
  
  // Use credentials for HTTPS, but be careful with HTTP on mobile
  const isHttps = window.location.protocol === 'https:' || 
                  API_BASE_URL.startsWith('https://')
  return isHttps
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    const currentUser = localStorage.getItem(CURRENT_USER_KEY)
    if (currentUser) {
      try {
        setUser(JSON.parse(currentUser))
      } catch (error) {
        console.error("Failed to parse current user:", error)
        localStorage.removeItem(CURRENT_USER_KEY)
      }
    }
    setIsLoading(false)
  }, [])

  const register = async (
    email: string,
    password: string,
    role: "order_taker" | "crew" | "order_taker_crew",
    name?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, role, name }),
      })

      if (!response.ok) {
        let errorMessage = 'Registration failed'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // If response isn't JSON, use status text
          errorMessage = response.statusText || errorMessage
        }
        return { success: false, error: errorMessage }
      }

      const data = await response.json()

      // Set current user
      const newUser: User = {
        id: data.data.id,
        email: data.data.email,
        role: data.data.role,
        name: data.data.name,
      }
      
      // Wrap localStorage in try-catch for mobile browser issues
      try {
        setUser(newUser)
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser))
      } catch (storageError) {
        console.error("localStorage error (common on mobile with IP addresses):", storageError)
        // Still set user in memory even if localStorage fails
        setUser(newUser)
        return { success: true, error: 'Registered but session may not persist' }
      }

      return { success: true }
    } catch (error) {
      console.error("Registration error:", error)
      // Provide more specific error messages
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return { success: false, error: "Network error. Please check your connection." }
      }
      return { success: false, error: "Registration failed. Please try again." }
    }
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Enhanced logging for debugging mobile issues
    console.log('[AUTH] Attempting login to:', `${API_BASE_URL}/auth/login`)
    console.log('[AUTH] Window protocol:', typeof window !== 'undefined' ? window.location.protocol : 'SSR')
    
    // Try login with retry logic for mobile browsers
    const attemptLogin = async (useCredentials: boolean): Promise<Response> => {
      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      }

      console.log(`[AUTH] Attempting fetch`)
      return await fetch(`${API_BASE_URL}/auth/login`, fetchOptions)
    }
    
    try {
      // First attempt: try with credentials (works on desktop and HTTPS)
      let response: Response
      let useCredentials = shouldUseCredentials()
      
      try {
        response = await attemptLogin(useCredentials)
      } catch (firstError) {
        // If first attempt fails on HTTP, try without credentials (for mobile browsers)
        if (!useCredentials || typeof window === 'undefined' || window.location.protocol === 'https:') {
          // Already tried without credentials or using HTTPS, so rethrow
          throw firstError
        }
        
        console.log('[AUTH] First attempt failed, retrying without credentials for mobile compatibility')
        useCredentials = false
        response = await attemptLogin(false)
      }

      console.log('[AUTH] Response status:', response.status, response.statusText)
      console.log('[AUTH] Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        let errorMessage = 'Login failed'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
          console.log('[AUTH] Error response:', errorData)
        } catch (parseError) {
          // If response isn't JSON, use status text
          errorMessage = response.statusText || errorMessage
          console.log('[AUTH] Failed to parse error response:', parseError)
        }
        return { success: false, error: errorMessage }
      }

      const data = await response.json()
      console.log('[AUTH] Login successful, user data:', data.data)

      // Set current user
      const loggedInUser: User = {
        id: data.data.id,
        email: data.data.email,
        role: data.data.role,
        name: data.data.name,
      }
      
      // Wrap localStorage in try-catch for mobile browser issues
      try {
        setUser(loggedInUser)
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(loggedInUser))
      } catch (storageError) {
        console.error("localStorage error (common on mobile with IP addresses):", storageError)
        // Still set user in memory even if localStorage fails
        setUser(loggedInUser)
        return { success: true, error: 'Logged in but session may not persist' }
      }

      return { success: true }
    } catch (error) {
      console.error("[AUTH] Login error - Full details:", error)
      console.error("[AUTH] Error name:", error instanceof Error ? error.name : 'Unknown')
      console.error("[AUTH] Error message:", error instanceof Error ? error.message : String(error))
      console.error("[AUTH] Error stack:", error instanceof Error ? error.stack : 'No stack')
      
      // Provide more specific error messages
      if (error instanceof TypeError) {
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          // This usually means CORS or network issue
          console.error("[AUTH] CORS or Network error detected. API URL:", API_BASE_URL)
          return { 
            success: false, 
            error: `Cannot connect to server. Please check: 1) Your internet connection, 2) The server is running at ${API_BASE_URL}` 
          }
        }
        return { success: false, error: `Network error: ${error.message}` }
      }
      
      // Handle other error types
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: `Login failed: ${errorMessage}` }
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(CURRENT_USER_KEY)
  }

  const changePassword = async (
    email: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, currentPassword, newPassword }),
      })

      if (!response.ok) {
        let errorMessage = 'Failed to change password'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // If response isn't JSON, use status text
          errorMessage = response.statusText || errorMessage
        }
        return { success: false, error: errorMessage }
      }

      const data = await response.json()

      return { success: true }
    } catch (error) {
      console.error("Change password error:", error)
      // Provide more specific error messages
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return { success: false, error: "Network error. Please check your connection." }
      }
      return { success: false, error: "Failed to change password. Please try again." }
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
