'use client'

/**
 * AuthContext - Authentication state backed by the real backend API.
 *
 * On mount it validates any stored token via GET /v1/auth/me. login() calls
 * POST /v1/auth/login and stores the tokens; logout() clears them.
 *
 * Permission/branch checks are derived client-side from the server-provided
 * `role` (UI convenience only — the backend is the real enforcement point).
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { User, UserRole, Permission } from '@/lib/types'
import {
  hasPermission,
  canAccessPage,
  canPerformAction,
} from '@/lib/auth'
import { loginRequest, getMeRequest } from '@/lib/api/auth'
import { setTokens, clearTokens, getAccessToken } from '@/lib/api/token-storage'

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

  // Validate the stored token (if any) on first load.
  useEffect(() => {
    let cancelled = false

    const loadUser = async () => {
      if (!getAccessToken()) {
        if (!cancelled) setIsLoading(false)
        return
      }
      try {
        const currentUser = await getMeRequest()
        if (!cancelled) setUser(currentUser)
      } catch (error) {
        // Token invalid/expired and refresh failed — clear and stay logged out.
        clearTokens()
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadUser()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { token, refreshToken, user: loggedInUser } = await loginRequest(email, password)
    setTokens(token, refreshToken)
    setUser(loggedInUser)
  }, [])

  const logout = useCallback(() => {
    clearTokens()
    setUser(null)
  }, [])

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
