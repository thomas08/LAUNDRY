/**
 * Linen inventory API — backend /v1/linen-items (read-only list).
 * Items are created/updated through the RFID sync pipeline, not here.
 */

import { apiFetch } from './client'
import type { LinenItemStatus, LinenOwnership } from '@/lib/types'

export interface LinenItemRow {
  tagId: string
  type: string
  articleId: string | null
  articleName: string | null
  customerId: string | null
  customerName: string | null
  branchId: string
  status: LinenItemStatus
  ownership: LinenOwnership
  washCycles: number
  version: number
  updatedAt: string
}

export interface LinenItemFilters {
  status?: LinenItemStatus
  ownership?: LinenOwnership
}

export async function fetchLinenItems(filters: LinenItemFilters = {}): Promise<LinenItemRow[]> {
  const qs = new URLSearchParams()
  if (filters.status) qs.set('status', filters.status)
  if (filters.ownership) qs.set('ownership', filters.ownership)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const data = await apiFetch<{ items: LinenItemRow[] }>(`/linen-items${suffix}`)
  return data.items || []
}
