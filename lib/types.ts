// Core data structures for LinenFlow™ application

export interface Customer {
  id: string
  name: string
  contactPerson: string
  email: string
  phone: string
}

export interface LinenItem {
  tagId: string
  type: string
  customerId: string
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