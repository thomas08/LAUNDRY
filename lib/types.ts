// Core data structures for LinenFlow™ application

// ============================================
// RBAC & Multi-Tenancy Types
// ============================================

/**
 * User roles in the system
 * - superadmin: Full access to all branches and all operations
 * - admin: Full access to assigned branch(es)
 * - user: Limited access - can view and create, but not delete
 */
export type UserRole = 'superadmin' | 'admin' | 'user'

/**
 * Permissions that can be granted
 */
export type Permission =
  | 'read'           // View data
  | 'create'         // Create new records
  | 'update'         // Edit existing records
  | 'delete'         // Delete records
  | 'manage_users'   // Manage users and roles
  | 'view_reports'   // Access reports
  | 'manage_settings' // Change system settings

/**
 * Branch/Location information for multi-tenancy
 */
export interface Branch {
  id: string
  name: string
  code: string // Short code like "BKK01", "CNX01"
  address: string
  phone: string
  isActive: boolean
}

/**
 * User with role and branch assignment
 */
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  branchId: string // Primary branch
  branchIds?: string[] // Multiple branches for superadmin/admin
  isActive: boolean
  createdAt: string
  lastLoginAt?: string
}

/**
 * Permission mapping for each role
 */
export interface RolePermissions {
  role: UserRole
  permissions: Permission[]
}

// ============================================
// Business Entity Types
// ============================================

export interface Customer {
  id: string
  name: string
  contactPerson: string
  email: string
  phone: string
  branchId: string // Multi-tenancy: Customer belongs to a branch
}

export interface LinenItem {
  tagId: string
  type: string
  customerId: string
  branchId: string // Multi-tenancy: Item belongs to a branch
  status: 'In Stock' | 'Washing' | 'On-Rent'
  washCycles: number
}

export interface ActivityLog {
  id: string
  type: "order" | "cleaning" | "rental" | "maintenance" | "customer" | "inventory"
  action: "created" | "updated" | "completed" | "cancelled" | "delivered" | "returned"
  entityId: string
  entityType: "customer" | "order" | "linen_item"
  description: string
  performedBy?: string
  timestamp: string
  metadata?: Record<string, any>
}

// Additional supporting types
export type OrderStatus = "pending" | "processing" | "completed" | "delivered" | "cancelled"
export type ChangeType = "positive" | "negative" | "neutral"

export interface KPIData {
  totalOrders: {
    value: string
    change: string
    changeType: ChangeType
  }
  activeOrders: {
    value: string
    change: string
    changeType: ChangeType
  }
  monthlyRevenue: {
    value: string
    change: string
    changeType: ChangeType
  }
  totalCustomers: {
    value: string
    change: string
    changeType: ChangeType
  }
}