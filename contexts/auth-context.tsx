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
        body: JSON.stringify({ email, password, role, name }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || 'Registration failed' }
      }

      // Set current user
      const newUser: User = {
        id: data.data.id,
        email: data.data.email,
        role: data.data.role,
        name: data.data.name,
      }
      setUser(newUser)
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser))

      return { success: true }
    } catch (error) {
      console.error("Registration error:", error)
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
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' }
      }

      // Set current user
      const loggedInUser: User = {
        id: data.data.id,
        email: data.data.email,
        role: data.data.role,
        name: data.data.name,
      }
      setUser(loggedInUser)
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(loggedInUser))

      return { success: true }
    } catch (error) {
      console.error("Login error:", error)
      return { success: false, error: "Login failed. Please try again." }
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(CURRENT_USER_KEY)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
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
