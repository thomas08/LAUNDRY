/**
 * RFID sync API — backend /v1/sync endpoints.
 *
 * Registration (single or batch) is expressed as `item_receive` scan events
 * uploaded via POST /v1/sync/batch. Each event carries a client-generated
 * `clientUuid` so re-submitting the same batch is idempotent.
 */

import { apiFetch } from './client'
import type { LinenOwnership, LinenItemStatus } from '@/lib/types'

export type ScanEventType =
  | 'item_receive'
  | 'item_status_change'
  | 'job_order_link'
  | 'stock_check'

export interface ScanEventInput {
  clientUuid: string
  eventType: ScanEventType
  tagId: string
  branchId: string
  newStatus?: LinenItemStatus | null
  jobOrderId?: string | null
  scannedAt: string // ISO8601
  payload?: Record<string, any> | null
}

export interface SyncEventResult {
  clientUuid: string
  result: 'applied' | 'rejected'
  reason?: string
  currentStatus?: LinenItemStatus
}

/** POST /v1/sync/batch — upload a batch of scan events. */
export async function syncBatch(
  deviceId: string,
  events: ScanEventInput[]
): Promise<SyncEventResult[]> {
  const data = await apiFetch<{ results: SyncEventResult[] }>('/sync/batch', {
    method: 'POST',
    body: { deviceId, events },
  })
  return data.results || []
}

/**
 * Build item_receive events for registering linen under one article/owner.
 * `crypto.randomUUID()` gives each tag an idempotency key.
 */
export function buildRegistrationEvents(params: {
  tagIds: string[]
  branchId: string
  articleId: string
  type: string
  ownership: LinenOwnership
  customerId?: string | null
  /** When set, stamps the events onto a registration session so the web station
   * counter/live list picks them up (matches the C72's session_id). */
  sessionId?: string | null
}): ScanEventInput[] {
  const now = new Date().toISOString()
  return params.tagIds.map((tagId) => ({
    clientUuid: crypto.randomUUID(),
    eventType: 'item_receive',
    tagId,
    branchId: params.branchId,
    newStatus: 'In Stock',
    scannedAt: now,
    payload: {
      articleId: params.articleId,
      type: params.type,
      ownership: params.ownership,
      customerId: params.customerId ?? null,
      sessionId: params.sessionId ?? null,
    },
  }))
}

/**
 * Build item_status_change events — one per tag — for check-in (Return
 * `On-Rent → In Stock`, Send to wash `→ Washing`) and dispatch (`In Stock → On-Rent`).
 * The server validates the transition per tag (rejecting e.g. an unknown tag or an
 * event type illegal from the tag's current status), so each tag passes/fails
 * independently. `jobOrderId` (dispatch) is carried on the same event and recorded in
 * the scan-event audit log. `crypto.randomUUID()` gives each tag an idempotency key.
 */
export function buildStatusChangeEvents(params: {
  tagIds: string[]
  branchId: string
  newStatus: LinenItemStatus
  jobOrderId?: string | null
}): ScanEventInput[] {
  const now = new Date().toISOString()
  return params.tagIds.map((tagId) => ({
    clientUuid: crypto.randomUUID(),
    eventType: 'item_status_change',
    tagId,
    branchId: params.branchId,
    newStatus: params.newStatus,
    jobOrderId: params.jobOrderId ?? null,
    scannedAt: now,
  }))
}

/**
 * Build stock_check events — one per tag — for audit / cycle counting. No status
 * change; the server only logs the scan (allowed from any current status). Rejected
 * only when the tag is unknown (never commissioned via item_receive).
 */
export function buildStockCheckEvents(params: {
  tagIds: string[]
  branchId: string
}): ScanEventInput[] {
  const now = new Date().toISOString()
  return params.tagIds.map((tagId) => ({
    clientUuid: crypto.randomUUID(),
    eventType: 'stock_check',
    tagId,
    branchId: params.branchId,
    scannedAt: now,
  }))
}
