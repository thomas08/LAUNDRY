'use client'

/**
 * AuthContext - Provides authentication state and user information
 * This is the central place for managing user authentication in the app
 */

import React, { createContext, useContext, useState, useEffect } from 'react'
import { User, UserRole, Permission } from '@/lib/types'
import {
  getCurrentUser,
  hasPermission,
  canAccessPage,
  canPerformAction,
  isAuthenticated
} from '@/lib/auth'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  hasPermission: (permission: Permission) => boolean
  canAccessPage: (path: string) => boolean
  canPerformAction: (action: Permission) => boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading user data
    // In production, this would fetch from session/token
    const loadUser = async () => {
      try {
        if (isAuthenticated()) {
          const currentUser = getCurrentUser()
          setUser(currentUser)
        }
      } catch (error) {
        console.error('Failed to load user:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [])

  const login = async (email: string, password: string) => {
    // TODO: Implement real authentication
    console.log('Login called with:', email)

    // Mock login - in production, call your auth API
    const mockUser = getCurrentUser()
    setUser(mockUser)
  }

  const logout = () => {
    // TODO: Implement real logout
    setUser(null)
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    hasPermission: (permission: Permission) => {
      if (!user) return false
      return hasPermission(user.role, permission)
    },
    canAccessPage: (path: string) => {
      if (!user) return false
      return canAccessPage(user.role, path)
    },
    canPerformAction: (action: Permission) => {
      if (!user) return false
      return canPerformAction(user.role, action)
    },
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook to access auth context
 * @throws Error if used outside AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/**
 * Hook to get current user
 * @returns User object or null if not authenticated
 */
export function useUser() {
  const { user } = useAuth()
  return user
}

/**
 * Hook to check if user has a specific role
 * @param role Role to check
 * @returns true if user has the role
 */
export function useRole(role: UserRole) {
  const { user } = useAuth()
  return user?.role === role
}
