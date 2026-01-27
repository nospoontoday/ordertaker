"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { Branch, BranchId, BRANCH_LIST, DEFAULT_BRANCH, BRANCH_STORAGE_KEY, isValidBranchId } from "@/lib/branches"
import { useAuth } from "@/contexts/auth-context"

interface BranchContextType {
  branches: Branch[]
  currentBranch: Branch
  setCurrentBranch: (branch: Branch) => void
  switchBranch: (branchId: BranchId) => void
  isLoading: boolean
  preferredBranch: BranchId | null
}

const BranchContext = createContext<BranchContextType | undefined>(undefined)

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth()
  const [currentBranch, setCurrentBranchState] = useState<Branch>(DEFAULT_BRANCH)
  const [isLoading, setIsLoading] = useState(true)
  const initializedRef = useRef(false)

  // Initialize branch from: preferredBranch > localStorage > default
  useEffect(() => {
    // Wait for auth to load before determining initial branch
    if (authLoading) return

    // Only run initialization once after auth loads
    if (initializedRef.current) return
    initializedRef.current = true

    try {
      let branchToSet: Branch | null = null

      // Priority 1: User's preferred branch
      if (user?.preferredBranch && isValidBranchId(user.preferredBranch)) {
        const preferredBranch = BRANCH_LIST.find(b => b.id === user.preferredBranch)
        if (preferredBranch) {
          branchToSet = preferredBranch
          console.log('[BRANCH] Using preferred branch:', preferredBranch.name)
        }
      }

      // Priority 2: localStorage saved branch
      if (!branchToSet) {
        const savedBranchId = localStorage.getItem(BRANCH_STORAGE_KEY)
        if (savedBranchId && isValidBranchId(savedBranchId)) {
          const savedBranch = BRANCH_LIST.find(b => b.id === savedBranchId)
          if (savedBranch) {
            branchToSet = savedBranch
            console.log('[BRANCH] Using localStorage branch:', savedBranch.name)
          }
        }
      }

      // Priority 3: Default branch (already set in state initialization)
      if (branchToSet) {
        setCurrentBranchState(branchToSet)
      } else {
        console.log('[BRANCH] Using default branch:', DEFAULT_BRANCH.name)
      }
    } catch (error) {
      console.error("Error loading saved branch:", error)
    } finally {
      setIsLoading(false)
    }
  }, [authLoading, user?.preferredBranch])

  // When user logs in with a preferred branch, switch to it
  useEffect(() => {
    if (!authLoading && user?.preferredBranch && initializedRef.current) {
      const preferredBranch = BRANCH_LIST.find(b => b.id === user.preferredBranch)
      if (preferredBranch && preferredBranch.id !== currentBranch.id) {
        setCurrentBranchState(preferredBranch)
        try {
          localStorage.setItem(BRANCH_STORAGE_KEY, preferredBranch.id)
        } catch (error) {
          console.error("Error saving branch to localStorage:", error)
        }
        console.log('[BRANCH] Switched to preferred branch on login:', preferredBranch.name)
      }
    }
  }, [user?.preferredBranch, authLoading])

  const setCurrentBranch = useCallback((branch: Branch) => {
    setCurrentBranchState(branch)
    try {
      localStorage.setItem(BRANCH_STORAGE_KEY, branch.id)
    } catch (error) {
      console.error("Error saving branch to localStorage:", error)
    }
  }, [])

  const switchBranch = useCallback((branchId: BranchId) => {
    const branch = BRANCH_LIST.find(b => b.id === branchId)
    if (branch) {
      setCurrentBranch(branch)
    }
  }, [setCurrentBranch])

  const preferredBranch = user?.preferredBranch || null

  return (
    <BranchContext.Provider value={{ branches: BRANCH_LIST, currentBranch, setCurrentBranch, switchBranch, isLoading, preferredBranch }}>
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  const context = useContext(BranchContext)
  if (context === undefined) {
    throw new Error("useBranch must be used within a BranchProvider")
  }
  return context
}

export function useCurrentBranchId(): BranchId {
  const { currentBranch } = useBranch()
  return currentBranch.id
}
