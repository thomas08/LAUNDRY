/**
 * Consumable Stock API — backend /v1/inventory-items endpoints.
 *
 * Two resources:
 *   - inventory_items : consumable master (branch-scoped CRUD)
 *   - stock movements : /:id/transactions (ledger; POST mutates current_stock atomically)
 *
 * Branch scoping + stock arithmetic (applyStockMovement) are enforced SERVER-side.
 * Mirrors lib/api/suppliers.ts (apiFetch + normalize + envelope).
 */

import { apiFetch } from './client'
import type {
  InventoryItem,
  InventoryItemType,
  InventoryUnit,
  StockTransaction,
  StockTransactionType,
} from '@/lib/types'

// lib/types.ts `InventoryItem` has no alertLevel; the backend derives it, so widen here.
export type StockAlertLevel = 'ok' | 'low' | 'critical' | 'out_of_stock'
export interface InventoryItemWithAlert extends InventoryItem {
  alertLevel: StockAlertLevel
  supplierName?: string | null
}

// ---- Input / filter types ----

export interface InventoryItemInput {
  code?: string            // usually omit — server issues INV-####
  name: string
  nameTh?: string | null
  nameEn?: string | null
  type?: InventoryItemType
  unit?: InventoryUnit
  currentStock?: number    // opening balance only (create); later change via movements
  minimumStock?: number
  maximumStock?: number | null
  reorderPoint?: number
  unitCost?: number
  supplierId?: string | null
  branchId: string
}

export interface StockMovementInput {
  type: StockTransactionType
  quantity: number         // in/out/return: > 0 ; adjustment: signed delta (≠0)
  unit?: InventoryUnit     // default = item's unit
  unitCost?: number        // default = item's unitCost
  referenceType?: 'job_order' | 'supplier_invoice' | 'manual' | null
  referenceId?: string | null
  fromBranchId?: string | null
  toBranchId?: string | null
  notes?: string | null
}

export interface InventoryItemFilters {
  type?: InventoryItemType
  alert?: 'low' | 'critical' | 'out_of_stock'
  includeInactive?: boolean
}

export interface MovementResult {
  transaction: StockTransaction
  item: InventoryItemWithAlert
}

// ---- Testable seams (implemented) ----

// Build the querystring for GET /inventory-items. Empty string when no filters.
// buildInventoryItemsQuery({}) === ''
// buildInventoryItemsQuery({ type: 'detergent', alert: 'low' }) === '?type=detergent&alert=low'
export function buildInventoryItemsQuery(filters: InventoryItemFilters = {}): string {
  const params = new URLSearchParams()
  if (filters.type) params.set('type', filters.type)
  if (filters.alert) params.set('alert', filters.alert)
  if (filters.includeInactive) params.set('includeInactive', 'true')
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

// pg NUMERIC cols come back as strings — coerce every numeric field.
export function normalize(i: any): InventoryItemWithAlert {
  const num = (v: any) => (v != null ? Number(v) : v)
  return {
    ...i,
    nameTh: i.nameTh ?? undefined,
    nameEn: i.nameEn ?? undefined,
    supplierId: i.supplierId ?? undefined,
    supplierName: i.supplierName ?? undefined,
    currentStock: num(i.currentStock),
    minimumStock: num(i.minimumStock),
    maximumStock: i.maximumStock != null ? Number(i.maximumStock) : undefined,
    reorderPoint: num(i.reorderPoint),
    unitCost: num(i.unitCost),
    isActive: Boolean(i.isActive),
    alertLevel: (i.alertLevel ?? 'ok') as StockAlertLevel,
  }
}

// pg NUMERIC coercion for a stock_transactions row.
export function normalizeTransaction(t: any): StockTransaction {
  const num = (v: any) => (v != null ? Number(v) : v)
  return {
    ...t,
    quantity: num(t.quantity),
    unitCost: num(t.unitCost),
    totalCost: num(t.totalCost),
    referenceType: t.referenceType ?? undefined,
    referenceId: t.referenceId ?? undefined,
    fromBranchId: t.fromBranchId ?? undefined,
    toBranchId: t.toBranchId ?? undefined,
    notes: t.notes ?? undefined,
  }
}

// ---- Request functions: ARCHITECT STUBS (Implementer fills bodies) ----

/** GET /v1/inventory-items — `{ inventoryItems }` envelope, mapped through normalize(). */
export async function fetchInventoryItems(
  filters: InventoryItemFilters = {}
): Promise<InventoryItemWithAlert[]> {
  const data = await apiFetch<{ inventoryItems: any[] }>(
    `/inventory-items${buildInventoryItemsQuery(filters)}`
  )
  return (data.inventoryItems || []).map(normalize)
}

/** GET /v1/inventory-items/:id — single object (no envelope). */
export async function fetchInventoryItem(id: string): Promise<InventoryItemWithAlert> {
  return normalize(await apiFetch(`/inventory-items/${id}`))
}

/** POST /v1/inventory-items — returns the created item (201). */
export async function createInventoryItem(input: InventoryItemInput): Promise<InventoryItemWithAlert> {
  return normalize(await apiFetch('/inventory-items', { method: 'POST', body: input }))
}

/** PUT /v1/inventory-items/:id — returns the updated item (current_stock is NOT editable here). */
export async function updateInventoryItem(
  id: string,
  input: Partial<InventoryItemInput>
): Promise<InventoryItemWithAlert> {
  return normalize(await apiFetch(`/inventory-items/${id}`, { method: 'PUT', body: input }))
}

/** DELETE /v1/inventory-items/:id — soft delete (deactivate). */
export async function deleteInventoryItem(id: string): Promise<InventoryItemWithAlert> {
  return normalize(await apiFetch(`/inventory-items/${id}`, { method: 'DELETE' }))
}

/** GET /v1/inventory-items/:id/transactions — `{ transactions }` envelope. */
export async function fetchTransactions(id: string): Promise<StockTransaction[]> {
  const data = await apiFetch<{ transactions: any[] }>(`/inventory-items/${id}/transactions`)
  return (data.transactions || []).map(normalizeTransaction)
}

/**
 * POST /v1/inventory-items/:id/transactions — record a stock movement (201).
 * Returns { transaction, item } where item carries the new current_stock + alertLevel.
 */
export async function recordMovement(
  id: string,
  input: StockMovementInput
): Promise<MovementResult> {
  const r = await apiFetch<{ transaction: any; item: any }>(
    `/inventory-items/${id}/transactions`,
    { method: 'POST', body: input }
  )
  return { transaction: normalizeTransaction(r.transaction), item: normalize(r.item) }
}
