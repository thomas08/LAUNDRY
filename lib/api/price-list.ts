/**
 * Customer price list API — backend /v1/customers/:id/price-list.
 *
 * Laundry pricing is PER CUSTOMER, not a single global rate card: the same SKU
 * is billed at different unit prices to different hotels (e.g. ผ้าเช็ดตัว is
 * 8/9/10/12฿ depending on the account). Prices therefore live here, not on the
 * linen article.
 *
 * `sku` follows the SKU catalog's own casing (product + size + activity, where
 * the activity part is lowercase — `6sp`, `A01Lsp`). Invoices print it
 * uppercase; the backend matches case-insensitively on write.
 */

import { apiFetch } from './client'

export type PriceServiceType = 'wash' | 'rental'

export interface PriceListEntry {
  id: string
  customerId: string
  sku: string
  productCode: string
  sizeCode: string
  activityCode: string
  serviceType: PriceServiceType
  unitPrice: number
  isActive: boolean
  /** Thai display name composed by the catalog; null if the SKU was retired. */
  displayName: string | null
  createdAt?: string
  updatedAt?: string
}

export interface PriceListInput {
  sku: string
  serviceType?: PriceServiceType
  unitPrice: number
}

export interface PriceListFilters {
  serviceType?: PriceServiceType
  includeInactive?: boolean
}

/** pg NUMERIC comes back as a string — coerce so arithmetic in the UI is safe. */
export function normalize(row: any): PriceListEntry {
  return {
    ...row,
    unitPrice: Number(row.unitPrice ?? 0),
    displayName: row.displayName ?? null,
  }
}

export function buildPriceListQuery(filters: PriceListFilters = {}): string {
  const qs = new URLSearchParams()
  if (filters.serviceType) qs.set('serviceType', filters.serviceType)
  if (filters.includeInactive) qs.set('includeInactive', 'true')
  return qs.toString() ? `?${qs.toString()}` : ''
}

/** GET /v1/customers/:id/price-list */
export async function fetchPriceList(
  customerId: string,
  filters: PriceListFilters = {}
): Promise<PriceListEntry[]> {
  const data = await apiFetch<{ prices: any[] }>(
    `/customers/${customerId}/price-list${buildPriceListQuery(filters)}`
  )
  return (data.prices || []).map(normalize)
}

/** POST /v1/customers/:id/price-list — add or overwrite one SKU's price. */
export async function savePrice(
  customerId: string,
  input: PriceListInput
): Promise<PriceListEntry> {
  return normalize(
    await apiFetch(`/customers/${customerId}/price-list`, { method: 'POST', body: input })
  )
}

/** PUT /v1/customers/:id/price-list/:rowId — change the price only. */
export async function updatePrice(
  customerId: string,
  rowId: string,
  unitPrice: number
): Promise<PriceListEntry> {
  return normalize(
    await apiFetch(`/customers/${customerId}/price-list/${rowId}`, {
      method: 'PUT',
      body: { unitPrice },
    })
  )
}

/** DELETE /v1/customers/:id/price-list/:rowId — soft delete (keeps price history). */
export async function deletePrice(customerId: string, rowId: string): Promise<PriceListEntry> {
  return normalize(
    await apiFetch(`/customers/${customerId}/price-list/${rowId}`, { method: 'DELETE' })
  )
}
