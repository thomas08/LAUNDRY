/**
 * Authentication and Authorization helpers for LinenFlow™
 * Handles RBAC (Role-Based Access Control) and permission checking
 */

import { UserRole, Permission, RolePermissions, User } from './types'

// ============================================
// Role-Permission Matrix
// ============================================

/**
 * Define which permissions each role has
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  superadmin: [
    'read',
    'create',
    'update',
    'delete',
    'manage_users',
    'view_reports',
    'manage_settings',
  ],
  admin: [
    'read',
    'create',
    'update',
    'delete',
    'view_reports',
  ],
  user: [
    'read',
    'create',
    'view_reports',
  ],
}

// ============================================
// Permission Checking Functions
// ============================================

/**
 * Check if a user role has a specific permission
 * @param role User's role
 * @param permission Permission to check
 * @returns true if role has permission
 */
export function hasPermission(
  role: UserRole,
  permission: Permission
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

/**
 * Check if user can access a specific page/route
 * @param role User's role
 * @param path Route path (e.g., "/customers", "/settings")
 * @returns true if user can access the page
 */
export function canAccessPage(role: UserRole, path: string): boolean {
  // Remove locale prefix if exists (e.g., "/en/customers" -> "/customers")
  const normalizedPath = path.replace(/^\/(en|th)/, '')

  // Public pages - everyone can access
  const publicPages = ['/', '/reports']
  if (publicPages.includes(normalizedPath)) {
    return true
  }

  // Settings page - only superadmin
  if (normalizedPath.startsWith('/settings')) {
    return role === 'superadmin'
  }

  // User management - only superadmin and admin
  if (normalizedPath.startsWith('/users')) {
    return hasPermission(role, 'manage_users')
  }

  // All other pages - check if user has read permission
  return hasPermission(role, 'read')
}

/**
 * Check if user can perform an action on a resource
 * @param role User's role
 * @param action Action to perform ('create', 'update', 'delete', etc.)
 * @returns true if user can perform action
 */
export function canPerformAction(
  role: UserRole,
  action: Permission
): boolean {
  return hasPermission(role, action)
}

// ============================================
// Branch Access Control (Multi-Tenancy)
// ============================================

/**
 * Check if user can access data from a specific branch
 * @param user User object
 * @param branchId Branch ID to check access for
 * @returns true if user can access branch data
 */
export function canAccessBranch(user: User, branchId: string): boolean {
  // Superadmin can access all branches
  if (user.role === 'superadmin') {
    return true
  }

  // Admin can access assigned branches
  if (user.role === 'admin' && user.branchIds) {
    return user.branchIds.includes(branchId)
  }

  // Regular user can only access their primary branch
  return user.branchId === branchId
}

/**
 * Filter data array to only include items from accessible branches
 * @param user User object
 * @param items Array of items with branchId property
 * @returns Filtered array
 */
export function filterByBranchAccess<T extends { branchId: string }>(
  user: User,
  items: T[]
): T[] {
  // Superadmin sees all
  if (user.role === 'superadmin') {
    return items
  }

  // Filter by accessible branches
  return items.filter(item => canAccessBranch(user, item.branchId))
}

/**
 * Get list of branch IDs that user can access
 * @param user User object
 * @returns Array of branch IDs
 */
export function getAccessibleBranchIds(user: User): string[] {
  if (user.role === 'superadmin') {
    // Superadmin should return all branch IDs
    // In real app, this would come from database
    return [] // Return empty array meaning "all branches"
  }

  if (user.role === 'admin' && user.branchIds) {
    return user.branchIds
  }

  return [user.branchId]
}

// ============================================
// Mock Authentication (for development)
// ============================================

/**
 * Mock user for development/testing
 * In production, this would come from your auth provider (NextAuth, Auth0, etc.)
 */
export const mockUsers: Record<string, User> = {
  superadmin: {
    id: 'user-1',
    email: 'superadmin@linenflow.com',
    name: 'Super Admin',
    role: 'superadmin',
    branchId: 'branch-1',
    branchIds: ['branch-1', 'branch-2', 'branch-3'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  admin: {
    id: 'user-2',
    email: 'admin@linenflow.com',
    name: 'Branch Admin',
    role: 'admin',
    branchId: 'branch-1',
    branchIds: ['branch-1'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  user: {
    id: 'user-3',
    email: 'user@linenflow.com',
    name: 'Regular User',
    role: 'user',
    branchId: 'branch-1',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
}

/**
 * Get current user (mock implementation)
 * In production, replace this with real session/token validation
 */
export function getCurrentUser(): User {
  // TODO: Replace with real authentication
  // For now, return mock superadmin for development
  return mockUsers.superadmin
}

/**
 * Check if user is authenticated
 * In production, this would check session/token validity
 */
export function isAuthenticated(): boolean {
  // TODO: Replace with real authentication check
  return true
}
