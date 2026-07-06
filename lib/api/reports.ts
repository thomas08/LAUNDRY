/**
 * Reports / Analytics API — backend /v1/reports endpoints (READ-ONLY aggregates).
 *
 * Three endpoints, all requiring `view_reports` and branch-scoped server-side:
 *   - GET /reports/summary          -> DashboardMetrics-superset object (KPI cards + panels)
 *   - GET /reports/sales-by-service -> revenue + count grouped by job_orders.service_type
 *   - GET /reports/cost-by-category -> SUM(expenses.total_amount) grouped by category
 *
 * pg returns NUMERIC/COUNT as strings — normalize() coerces every aggregate to a number.
 * Mirrors lib/api/inventory-items.ts (apiFetch + normalize + envelope + buildQuery seam).
 */

import { apiFetch } from './client'
import type { ReportPeriod } from '@/lib/types'

// ---- Filter type (shared by all three endpoints) ----
export interface ReportFilters {
  period: ReportPeriod          // default 'monthly' if omitted upstream
  start?: string                // 'YYYY-MM-DD' — required only when period === 'custom'
  end?: string                  // 'YYYY-MM-DD' — required only when period === 'custom'
  branchId?: string             // narrow to one accessible branch (else all accessible)
}

// ---- Response shapes (align to backend ReportModel + DashboardMetrics) ----
// Superset of lib/types.ts DashboardMetrics with a few page-only extras.
export interface ReportSummary {
  period: ReportPeriod
  periodStart: string
  periodEnd: string
  prevPeriodStart: string
  prevPeriodEnd: string
  branchId: string | null

  totalRevenue: number
  previousRevenue: number
  revenueChange: number | null

  totalCosts: number
  previousCosts: number
  costsChange: number | null

  grossProfit: number
  grossProfitMargin: number

  totalOrders: number
  ordersChange: number | null
  itemsProcessed: number
  itemsProcessedChange: number | null
  completedOrders: number
  pendingOrders: number
  activeJobOrders: number
  completionRate: number
  onTimeDeliveryRate: number
  averageProcessingTime: number
  averageProcessingTimeChange: number | null
  averageOrderValue: number

  totalCustomers: number
  activeCustomers: number
  newCustomers: number
  returningCustomers: number
  customerRetentionRate: number

  inventoryValue: number
  lowStockItems: number
  outOfStockItems: number
  totalInventoryItems: number
}

export interface SalesByServiceRow {
  serviceType: string
  orderCount: number
  revenue: number
  percentage: number
}

export interface CostByCategoryRow {
  category: string
  amount: number
  count: number
  percentage: number
}

// ---- Testable seams (implemented) ----

// Build the querystring for a /reports/* GET. Empty period is invalid upstream but tolerated here.
// buildReportsQuery({ period: 'monthly' }) === '?period=monthly'
// buildReportsQuery({ period: 'custom', start: '2026-01-01', end: '2026-01-31', branchId: 'b1' })
//   === '?period=custom&start=2026-01-01&end=2026-01-31&branchId=b1'
export function buildReportsQuery(filters: ReportFilters): string {
  const params = new URLSearchParams()
  if (filters.period) params.set('period', filters.period)
  if (filters.start) params.set('start', filters.start)
  if (filters.end) params.set('end', filters.end)
  if (filters.branchId) params.set('branchId', filters.branchId)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

// Coerce every numeric field of a summary payload; keep nullable %-change fields as number|null.
export function normalize(s: any): ReportSummary {
  const num = (v: any) => (v != null ? Number(v) : 0)
  const numOrNull = (v: any) => (v == null ? null : Number(v))
  return {
    period: s.period,
    periodStart: s.periodStart,
    periodEnd: s.periodEnd,
    prevPeriodStart: s.prevPeriodStart,
    prevPeriodEnd: s.prevPeriodEnd,
    branchId: s.branchId ?? null,

    totalRevenue: num(s.totalRevenue),
    previousRevenue: num(s.previousRevenue),
    revenueChange: numOrNull(s.revenueChange),

    totalCosts: num(s.totalCosts),
    previousCosts: num(s.previousCosts),
    costsChange: numOrNull(s.costsChange),

    grossProfit: num(s.grossProfit),
    grossProfitMargin: num(s.grossProfitMargin),

    totalOrders: num(s.totalOrders),
    ordersChange: numOrNull(s.ordersChange),
    itemsProcessed: num(s.itemsProcessed),
    itemsProcessedChange: numOrNull(s.itemsProcessedChange),
    completedOrders: num(s.completedOrders),
    pendingOrders: num(s.pendingOrders),
    activeJobOrders: num(s.activeJobOrders),
    completionRate: num(s.completionRate),
    onTimeDeliveryRate: num(s.onTimeDeliveryRate),
    averageProcessingTime: num(s.averageProcessingTime),
    averageProcessingTimeChange: numOrNull(s.averageProcessingTimeChange),
    averageOrderValue: num(s.averageOrderValue),

    totalCustomers: num(s.totalCustomers),
    activeCustomers: num(s.activeCustomers),
    newCustomers: num(s.newCustomers),
    returningCustomers: num(s.returningCustomers),
    customerRetentionRate: num(s.customerRetentionRate),

    inventoryValue: num(s.inventoryValue),
    lowStockItems: num(s.lowStockItems),
    outOfStockItems: num(s.outOfStockItems),
    totalInventoryItems: num(s.totalInventoryItems),
  }
}

// Coerce numeric fields of one sales-by-service row.
export function normalizeSalesRow(r: any): SalesByServiceRow {
  return {
    serviceType: r.serviceType,
    orderCount: Number(r.orderCount),
    revenue: Number(r.revenue),
    percentage: Number(r.percentage),
  }
}

// Coerce numeric fields of one cost-by-category row.
export function normalizeCostRow(r: any): CostByCategoryRow {
  return {
    category: r.category,
    amount: Number(r.amount),
    count: Number(r.count),
    percentage: Number(r.percentage),
  }
}

// ---- Request functions: ARCHITECT STUBS (Implementer fills bodies) ----

/**
 * GET /v1/reports/summary — single object (no envelope), mapped through normalize().
 * Implementer body:
 *   return normalize(await apiFetch(`/reports/summary${buildReportsQuery(filters)}`))
 */
export async function fetchSummary(filters: ReportFilters): Promise<ReportSummary> {
  return normalize(await apiFetch(`/reports/summary${buildReportsQuery(filters)}`))
}

/**
 * GET /v1/reports/sales-by-service — `{ salesByService }` envelope.
 * Implementer body:
 *   const data = await apiFetch<{ salesByService: any[] }>(`/reports/sales-by-service${buildReportsQuery(filters)}`)
 *   return (data.salesByService || []).map(normalizeSalesRow)
 */
export async function fetchSalesByService(filters: ReportFilters): Promise<SalesByServiceRow[]> {
  const data = await apiFetch<{ salesByService: any[] }>(
    `/reports/sales-by-service${buildReportsQuery(filters)}`
  )
  return (data.salesByService || []).map(normalizeSalesRow)
}

/**
 * GET /v1/reports/cost-by-category — `{ costByCategory }` envelope.
 * Implementer body:
 *   const data = await apiFetch<{ costByCategory: any[] }>(`/reports/cost-by-category${buildReportsQuery(filters)}`)
 *   return (data.costByCategory || []).map(normalizeCostRow)
 */
export async function fetchCostByCategory(filters: ReportFilters): Promise<CostByCategoryRow[]> {
  const data = await apiFetch<{ costByCategory: any[] }>(
    `/reports/cost-by-category${buildReportsQuery(filters)}`
  )
  return (data.costByCategory || []).map(normalizeCostRow)
}
