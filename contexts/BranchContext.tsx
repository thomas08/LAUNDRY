'use client'

/**
 * BranchContext - Provides branch/location information for multi-tenancy
 * Manages which branch the user is currently working with
 */

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Branch } from '@/lib/types'
import { useUser } from './AuthContext'
import { getAccessibleBranchIds, canAccessBranch } from '@/lib/auth'

interface BranchContextType {
  currentBranch: Branch | null
  availableBranches: Branch[]
  isLoading: boolean
  switchBranch: (branchId: string) => void
  canAccessBranch: (branchId: string) => boolean
}

const BranchContext = createContext<BranchContextType | undefined>(undefined)

// Mock branches for development
const mockBranches: Branch[] = [
  {
    id: 'branch-1',
    name: 'Bangkok Central',
    code: 'BKK01',
    address: '123 Sukhumvit Rd, Bangkok 10110',
    phone: '+66-2-123-4567',
    isActive: true,
  },
  {
    id: 'branch-2',
    name: 'Chiang Mai',
    code: 'CNX01',
    address: '456 Nimmanhaemin Rd, Chiang Mai 50200',
    phone: '+66-53-456-7890',
    isActive: true,
  },
  {
    id: 'branch-3',
    name: 'Phuket',
    code: 'HKT01',
    address: '789 Patong Beach Rd, Phuket 83150',
    phone: '+66-76-789-0123',
    isActive: true,
  },
]

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const user = useUser()
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null)
  const [availableBranches, setAvailableBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setIsLoading(false)
      return
    }

    // Get branches user can access
    const accessibleBranchIds = getAccessibleBranchIds(user)

    let userBranches: Branch[]
    if (accessibleBranchIds.length === 0) {
      // Superadmin - all branches
      userBranches = mockBranches
    } else {
      // Filter by accessible branch IDs
      userBranches = mockBranches.filter(b =>
        accessibleBranchIds.includes(b.id)
      )
    }

    setAvailableBranches(userBranches)

    // Set current branch to user's primary branch
    const primaryBranch = userBranches.find(b => b.id === user.branchId)
    setCurrentBranch(primaryBranch || userBranches[0] || null)

    setIsLoading(false)
  }, [user])

  const switchBranch = (branchId: string) => {
    if (!user) return

    // Check if user can access this branch
    if (!canAccessBranch(user, branchId)) {
      console.error('User cannot access branch:', branchId)
      return
    }

    const branch = availableBranches.find(b => b.id === branchId)
    if (branch) {
      setCurrentBranch(branch)
      // Store in localStorage for persistence
      localStorage.setItem('currentBranchId', branchId)
    }
  }

  const value: BranchContextType = {
    currentBranch,
    availableBranches,
    isLoading,
    switchBranch,
    canAccessBranch: (branchId: string) => {
      if (!user) return false
      return canAccessBranch(user, branchId)
    },
  }

  return (
    <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
  )
}

/**
 * Hook to access branch context
 * @throws Error if used outside BranchProvider
 */
export function useBranch() {
  const context = useContext(BranchContext)
  if (context === undefined) {
    throw new Error('useBranch must be used within a BranchProvider')
  }
  return context
}

/**
 * Hook to get current branch ID (shorthand)
 * @returns Current branch ID or null
 */
export function useCurrentBranchId(): string | null {
  const { currentBranch } = useBranch()
  return currentBranch?.id || null
}

/**
 * Hook to get current branch info
 * @returns Current branch object or null
 */
export function useCurrentBranch(): Branch | null {
  const { currentBranch } = useBranch()
  return currentBranch
}
