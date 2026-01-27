"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { Branch, BranchId, BRANCH_LIST, DEFAULT_BRANCH, BRANCH_STORAGE_KEY, isValidBranchId } from "@/lib/branches"

interface BranchContextType {
  branches: Branch[]
  currentBranch: Branch
  setCurrentBranch: (branch: Branch) => void
  switchBranch: (branchId: BranchId) => void
  isLoading: boolean
}

const BranchContext = createContext<BranchContextType | undefined>(undefined)

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [currentBranch, setCurrentBranchState] = useState<Branch>(DEFAULT_BRANCH)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      const savedBranchId = localStorage.getItem(BRANCH_STORAGE_KEY)
      if (savedBranchId && isValidBranchId(savedBranchId)) {
        const savedBranch = BRANCH_LIST.find(b => b.id === savedBranchId)
        if (savedBranch) {
          setCurrentBranchState(savedBranch)
        }
      }
    } catch (error) {
      console.error("Error loading saved branch:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

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

  return (
    <BranchContext.Provider value={{ branches: BRANCH_LIST, currentBranch, setCurrentBranch, switchBranch, isLoading }}>
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
