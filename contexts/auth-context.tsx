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
        credentials: 'include', // Critical for mobile browsers with CORS
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
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Critical for mobile browsers with CORS
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        let errorMessage = 'Login failed'
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
      console.error("Login error:", error)
      // Provide more specific error messages
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return { success: false, error: "Network error. Please check your connection." }
      }
      return { success: false, error: "Login failed. Please try again." }
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
        credentials: 'include', // Critical for mobile browsers with CORS
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
