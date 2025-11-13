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

// ============================================
// INVENTORY MANAGEMENT SYSTEM
// ============================================

/**
 * Types of inventory items (consumables)
 */
export type InventoryItemType =
  | 'detergent'           // ผงซักฟอก
  | 'softener'            // น้ำยาปรับผ้านุ่ม
  | 'bleach'              // น้ำยาฟอกขาว
  | 'stain_remover'       // น้ำยาขจัดคราบ
  | 'packaging'           // วัสดุบรรจุภัณฑ์
  | 'plastic_bag'         // ถุงพลาสติก
  | 'hanger'              // ไม้แขวน
  | 'tag'                 // ป้ายสินค้า
  | 'gas'                 // แก๊ส
  | 'other'               // อื่นๆ

/**
 * Unit of measurement for inventory
 */
export type InventoryUnit =
  | 'kg'      // กิโลกรัม
  | 'liter'   // ลิตร
  | 'piece'   // ชิ้น
  | 'box'     // กล่อง
  | 'bottle'  // ขวด
  | 'tank'    // ถัง

/**
 * Inventory item (consumable materials)
 */
export interface InventoryItem {
  id: string
  code: string              // รหัสสินค้า เช่น "DET-001"
  name: string              // ชื่อสินค้า
  nameEn?: string           // English name
  nameTh?: string           // ชื่อภาษาไทย
  type: InventoryItemType
  unit: InventoryUnit
  currentStock: number      // สต็อกปัจจุบัน
  minimumStock: number      // สต็อกขั้นต่ำ
  maximumStock?: number     // สต็อกสูงสุด
  reorderPoint: number      // จุดสั่งซื้อใหม่
  unitCost: number          // ต้นทุนต่อหน่วย (บาท)
  supplierId?: string       // ผู้จัดจำหน่าย
  branchId: string          // สาขาที่เก็บสต็อก
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Stock transaction types
 */
export type StockTransactionType =
  | 'stock_in'      // รับเข้า
  | 'stock_out'     // เบิกจ่าย
  | 'adjustment'    // ปรับปรุง
  | 'transfer'      // โอนย้าย
  | 'return'        // คืน

/**
 * Stock movement transaction
 */
export interface StockTransaction {
  id: string
  inventoryItemId: string
  type: StockTransactionType
  quantity: number          // จำนวน (+/-)
  unit: InventoryUnit
  unitCost: number          // ต้นทุนต่อหน่วย
  totalCost: number         // ต้นทุนรวม
  referenceType?: 'job_order' | 'supplier_invoice' | 'manual'
  referenceId?: string      // อ้างอิง Job Order หรือ Invoice
  fromBranchId?: string     // โอนจากสาขา
  toBranchId?: string       // โอนไปสาขา
  branchId: string          // สาขาที่ทำธุรกรรม
  performedBy: string       // User ID
  notes?: string
  createdAt: string
}

/**
 * Supplier information
 */
export interface Supplier {
  id: string
  code: string              // รหัสผู้จัดจำหน่าย เช่น "SUP-001"
  name: string              // ชื่อบริษัท
  nameTh?: string
  nameEn?: string
  contactPerson: string
  email: string
  phone: string
  address: string
  taxId?: string            // เลขประจำตัวผู้เสียภาษี
  paymentTerms?: number     // เครดิต (วัน)
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Low stock alert
 */
export interface StockAlert {
  id: string
  inventoryItemId: string
  branchId: string
  currentStock: number
  minimumStock: number
  alertLevel: 'low' | 'critical' | 'out_of_stock'
  isResolved: boolean
  resolvedAt?: string
  createdAt: string
}

// ============================================
// OPERATIONS MANAGEMENT SYSTEM
// ============================================

/**
 * Job order status
 */
export type JobOrderStatus =
  | 'pending'       // รอดำเนินการ
  | 'in_progress'   // กำลังดำเนินการ
  | 'washing'       // กำลังซัก
  | 'drying'        // กำลังอบ
  | 'ironing'       // กำลังรีด
  | 'quality_check' // ตรวจสอบคุณภาพ
  | 'completed'     // เสร็จสิ้น
  | 'delivered'     // ส่งมอบแล้ว
  | 'cancelled'     // ยกเลิก

/**
 * Service type
 */
export type ServiceType =
  | 'wash_fold'     // ซักพับ
  | 'dry_clean'     // ซักแห้ง
  | 'iron_only'     // รีดอย่างเดียว
  | 'wash_iron'     // ซักและรีด
  | 'express'       // บริการด่วน

/**
 * Job Order (ใบสั่งงาน)
 */
export interface JobOrder {
  id: string
  orderNumber: string       // เลขที่ใบสั่งงาน เช่น "JO-2024-0001"
  customerId: string
  branchId: string
  serviceType: ServiceType
  status: JobOrderStatus

  // Weight & Quantity
  weight: number            // น้ำหนัก (kg)
  itemCount: number         // จำนวนชิ้น

  // Dates
  receivedAt: string        // วันที่รับ
  dueDate: string           // กำหนดส่ง
  completedAt?: string      // วันที่เสร็จ
  deliveredAt?: string      // วันที่ส่งมอบ

  // Pricing
  servicePrice: number      // ราคาบริการ
  additionalCharges?: number // ค่าใช้จ่ายเพิ่มเติม
  discount?: number         // ส่วนลด
  totalPrice: number        // ราคารวม

  // References
  assignedTo?: string       // User ID ผู้รับผิดชอบ
  notes?: string

  createdAt: string
  updatedAt: string
}

/**
 * Machine/Equipment types
 */
export type MachineType =
  | 'washer'        // เครื่องซัก
  | 'dryer'         // เครื่องอบ
  | 'iron'          // เตารีด
  | 'press'         // เครื่องรีด

/**
 * Machine/Equipment
 */
export interface Machine {
  id: string
  code: string              // รหัสเครื่อง เช่น "WSH-01"
  name: string
  type: MachineType
  capacity: number          // ความจุ (kg)
  branchId: string
  isActive: boolean
  purchaseDate?: string
  lastMaintenanceDate?: string
  nextMaintenanceDate?: string
  createdAt: string
  updatedAt: string
}

/**
 * Production record (บันทึกการผลิต)
 */
export interface ProductionRecord {
  id: string
  jobOrderId: string
  branchId: string

  // Machine usage
  machineId?: string
  machineType: MachineType

  // Measurements
  weight: number            // น้ำหนักที่ซัก (kg)
  waterUsed?: number        // น้ำที่ใช้ (ลิตร)
  electricityUsed?: number  // ไฟฟ้าที่ใช้ (kWh)
  gasUsed?: number          // แก๊สที่ใช้ (kg)

  // Time tracking
  startTime: string
  endTime: string
  duration: number          // นาที

  // Cost linkage
  laborCost?: number
  utilityCost?: number
  totalCost: number

  performedBy: string       // User ID
  notes?: string
  createdAt: string
}

/**
 * Resource usage (ความเชื่อมโยงระหว่าง Job Order กับวัสดุที่ใช้)
 */
export interface ResourceUsage {
  id: string
  jobOrderId: string
  productionRecordId?: string
  inventoryItemId: string   // วัสดุที่ใช้
  quantity: number          // จำนวนที่ใช้
  unit: InventoryUnit
  unitCost: number          // ต้นทุนต่อหน่วย
  totalCost: number         // ต้นทุนรวม
  branchId: string
  createdAt: string
}

// ============================================
// FINANCE & ACCOUNTING SYSTEM
// ============================================

/**
 * Cost Center (ศูนย์ต้นทุน)
 */
export interface CostCenter {
  id: string
  code: string              // รหัสศูนย์ต้นทุน เช่น "LAU", "POR", "FIS"
  name: string
  nameTh?: string
  nameEn?: string
  description?: string
  branchId?: string         // null = company-wide
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Expense category
 */
export type ExpenseCategory =
  | 'materials'             // วัสดุสิ้นเปลือง
  | 'utilities'             // สาธารณูปโภค (ไฟ น้ำ แก๊ส)
  | 'labor'                 // ค่าแรง
  | 'rent'                  // ค่าเช่า
  | 'maintenance'           // ค่าบำรุงรักษา
  | 'transportation'        // ค่าขนส่ง
  | 'office_supplies'       // เครื่องใช้สำนักงาน
  | 'marketing'             // การตลาด
  | 'other'                 // อื่นๆ

/**
 * Payment method
 */
export type PaymentMethod =
  | 'cash'                  // เงินสด
  | 'bank_transfer'         // โอนเงิน
  | 'credit_card'           // บัตรเครดิต
  | 'cheque'                // เช็ค
  | 'promissory_note'       // ตั๋วเงิน

/**
 * Expense record
 */
export interface Expense {
  id: string
  expenseNumber: string     // เลขที่รายจ่าย
  category: ExpenseCategory
  description: string
  amount: number            // จำนวนเงิน (ไม่รวม VAT)
  vatAmount?: number        // VAT 7%
  totalAmount: number       // รวม VAT

  // Cost allocation
  costCenterId?: string     // ศูนย์ต้นทุน
  branchId: string

  // Payment
  paymentMethod: PaymentMethod
  paymentDate: string

  // References
  supplierId?: string
  jobOrderId?: string       // เชื่อมโยงกับ Job Order (ถ้ามี)
  invoiceNumber?: string    // เลขที่ใบแจ้งหนี้
  receiptNumber?: string    // เลขที่ใบเสร็จ

  attachments?: string[]    // URLs to uploaded files
  approvedBy?: string       // User ID
  recordedBy: string        // User ID

  notes?: string
  createdAt: string
  updatedAt: string
}

/**
 * Invoice status
 */
export type InvoiceStatus =
  | 'draft'         // ฉบับร่าง
  | 'issued'        // ออกแล้ว
  | 'paid'          // จ่ายแล้ว
  | 'partially_paid' // จ่ายบางส่วน
  | 'overdue'       // เกินกำหนด
  | 'cancelled'     // ยกเลิก

/**
 * Invoice (ใบแจ้งหนี้/ใบกำกับภาษี)
 */
export interface Invoice {
  id: string
  invoiceNumber: string     // เลขที่ใบแจ้งหนี้
  customerId: string
  branchId: string

  // Line items
  jobOrderIds: string[]     // Job Orders ในใบแจ้งหนี้นี้

  // Amounts
  subtotal: number          // ยอดรวมก่อน VAT
  vatRate: number           // อัตรา VAT (เช่น 0.07)
  vatAmount: number         // VAT
  discount?: number         // ส่วนลด
  totalAmount: number       // ยอดรวมสุทธิ

  // Status & Dates
  status: InvoiceStatus
  issuedDate: string
  dueDate: string
  paidDate?: string

  // Payment tracking
  paidAmount: number        // จำนวนที่จ่ายแล้ว
  remainingAmount: number   // ค้างชำระ

  notes?: string
  createdAt: string
  updatedAt: string
}

/**
 * Payment record
 */
export interface Payment {
  id: string
  paymentNumber: string
  invoiceId: string
  customerId: string
  branchId: string

  amount: number
  paymentMethod: PaymentMethod
  paymentDate: string

  referenceNumber?: string  // เลขที่อ้างอิง (เลขโอน, เลขเช็ค)
  receivedBy: string        // User ID

  notes?: string
  createdAt: string
}

// ============================================
// DASHBOARD & REPORTING SYSTEM
// ============================================

/**
 * Report type
 */
export type ReportType =
  | 'sales_by_customer'     // ยอดขายตามลูกค้า
  | 'sales_by_service'      // ยอดขายตามประเภทบริการ
  | 'cost_by_center'        // ต้นทุนตามศูนย์ต้นทุน
  | 'cost_by_material'      // ต้นทุนตามวัสดุ
  | 'cost_by_job'           // ต้นทุนตาม Job Order
  | 'inventory_movement'    // การเคลื่อนไหววัสดุ
  | 'profit_loss'           // กำไร-ขาดทุน
  | 'cash_flow'             // กระแสเงินสด
  | 'production_efficiency' // ประสิทธิภาพการผลิต

/**
 * Report period
 */
export type ReportPeriod =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'custom'

/**
 * Dashboard metrics for management
 */
export interface DashboardMetrics {
  // Sales metrics
  totalRevenue: number
  revenueChange: number       // % เปลี่ยนแปลง
  totalOrders: number
  ordersChange: number

  // Cost metrics
  totalCosts: number
  costsChange: number
  grossProfit: number
  grossProfitMargin: number   // %

  // Inventory metrics
  lowStockItems: number       // จำนวนรายการสต็อกต่ำ
  outOfStockItems: number     // สินค้าหมด
  inventoryValue: number      // มูลค่าสต็อก

  // Operations metrics
  activeJobOrders: number
  completionRate: number      // % อัตราการทำสำเร็จ
  averageProcessingTime: number // ชั่วโมง
  onTimeDeliveryRate: number  // % ส่งตรงเวลา

  // Customer metrics
  totalCustomers: number
  activeCustomers: number     // ลูกค้าที่ใช้บริการเดือนนี้
  customerRetentionRate: number // % รักษาลูกค้า

  // By branch (for multi-branch view)
  branchId?: string
  period: ReportPeriod
  periodStart: string
  periodEnd: string
}

/**
 * Cost breakdown data
 */
export interface CostBreakdown {
  costCenterId?: string
  costCenterName?: string
  materialCosts: number
  laborCosts: number
  utilityCosts: number
  overheadCosts: number
  totalCosts: number
  percentage: number          // % of total costs
}

/**
 * Material usage trend
 */
export interface MaterialUsageTrend {
  inventoryItemId: string
  itemName: string
  unit: InventoryUnit

  // Time-series data
  usageByPeriod: {
    period: string          // YYYY-MM or YYYY-MM-DD
    quantity: number
    cost: number
  }[]

  // Analytics
  averageMonthlyUsage: number
  trend: 'increasing' | 'decreasing' | 'stable'
  forecastNextMonth?: number // ทำนายการใช้เดือนถัดไป
}