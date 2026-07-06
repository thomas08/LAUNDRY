/**
 * Unit tests for the sync builder helpers (lib/api/sync.ts).
 *
 * Written against the Architect's FINALIZED interface (checkin-dispatch-spec.md
 * §3 helper signatures + §6 testable seams). `buildStatusChangeEvents` and
 * `buildStockCheckEvents` are PURE (no network) — tested directly. One request-shape
 * test for `syncBatch` mocks the network boundary (`apiFetch`).
 *
 * Mirrors the style of lib/api/suppliers.test.ts / inventory-items.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(),
}))

import { apiFetch } from '@/lib/api/client'
import {
  buildStatusChangeEvents,
  buildStockCheckEvents,
  syncBatch,
  type ScanEventInput,
} from '@/lib/api/sync'
import type { LinenItemStatus } from '@/lib/types'

const mockedApiFetch = vi.mocked(apiFetch)

function lastCall() {
  return mockedApiFetch.mock.calls[mockedApiFetch.mock.calls.length - 1]
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

beforeEach(() => {
  mockedApiFetch.mockReset()
})

// ---------------------------------------------------------------------------
// 1. buildStatusChangeEvents — pure seam (spec §6)
// ---------------------------------------------------------------------------
describe('buildStatusChangeEvents — pure event builder', () => {
  it('returns one event per tagId, in order', () => {
    const ev = buildStatusChangeEvents({
      tagIds: ['LN001', 'LN002', 'LN003'],
      branchId: 'branch-1',
      newStatus: 'On-Rent',
    })
    expect(ev).toHaveLength(3)
    expect(ev.map((e) => e.tagId)).toEqual(['LN001', 'LN002', 'LN003'])
  })

  it('sets eventType item_status_change, correct tagId + branchId + newStatus', () => {
    const ev = buildStatusChangeEvents({
      tagIds: ['LN001', 'LN002'],
      branchId: 'branch-1',
      newStatus: 'On-Rent',
      jobOrderId: 'jo-99',
    })
    expect(ev[0]).toMatchObject({
      eventType: 'item_status_change',
      tagId: 'LN001',
      branchId: 'branch-1',
      newStatus: 'On-Rent',
      jobOrderId: 'jo-99',
    })
    expect(ev[1]).toMatchObject({
      eventType: 'item_status_change',
      tagId: 'LN002',
      branchId: 'branch-1',
      newStatus: 'On-Rent',
      jobOrderId: 'jo-99',
    })
  })

  it('carries the passed jobOrderId on every event', () => {
    const ev = buildStatusChangeEvents({
      tagIds: ['LN001', 'LN002'],
      branchId: 'branch-1',
      newStatus: 'On-Rent',
      jobOrderId: 'jo-99',
    })
    expect(ev.every((e) => e.jobOrderId === 'jo-99')).toBe(true)
  })

  it('defaults jobOrderId to null when omitted', () => {
    const ev = buildStatusChangeEvents({
      tagIds: ['LN001', 'LN002'],
      branchId: 'branch-1',
      newStatus: 'In Stock',
    })
    expect(ev.every((e) => e.jobOrderId === null)).toBe(true)
  })

  it('coerces jobOrderId null through to null', () => {
    const ev = buildStatusChangeEvents({
      tagIds: ['LN001'],
      branchId: 'branch-1',
      newStatus: 'On-Rent',
      jobOrderId: null,
    })
    expect(ev[0].jobOrderId).toBeNull()
  })

  it('emits NO payload key', () => {
    const ev = buildStatusChangeEvents({
      tagIds: ['LN001'],
      branchId: 'branch-1',
      newStatus: 'On-Rent',
    })
    expect('payload' in ev[0]).toBe(false)
    expect(ev[0].payload).toBeUndefined()
  })

  // Cover all three canonical statuses (Return / Wash / Dispatch)
  const statuses: LinenItemStatus[] = ['In Stock', 'Washing', 'On-Rent']
  it.each(statuses)('produces the same shape for newStatus %s', (status) => {
    const ev = buildStatusChangeEvents({
      tagIds: ['LN001'],
      branchId: 'branch-1',
      newStatus: status,
    })
    expect(ev[0]).toMatchObject({
      eventType: 'item_status_change',
      tagId: 'LN001',
      branchId: 'branch-1',
      newStatus: status,
      jobOrderId: null,
    })
    expect(ev[0].clientUuid).toMatch(UUID_RE)
    expect('payload' in ev[0]).toBe(false)
  })

  it('returns [] for empty tagIds', () => {
    expect(
      buildStatusChangeEvents({ tagIds: [], branchId: 'branch-1', newStatus: 'On-Rent' })
    ).toEqual([])
  })

  it('gives every event a distinct, non-empty UUID clientUuid', () => {
    const ev = buildStatusChangeEvents({
      tagIds: ['LN001', 'LN002', 'LN003', 'LN004'],
      branchId: 'branch-1',
      newStatus: 'On-Rent',
    })
    for (const e of ev) {
      expect(e.clientUuid).toBeTruthy()
      expect(e.clientUuid).toMatch(UUID_RE)
    }
    expect(new Set(ev.map((e) => e.clientUuid)).size).toBe(ev.length)
  })

  it('stamps a single valid ISO-8601 scannedAt shared by all events in one call', () => {
    const ev = buildStatusChangeEvents({
      tagIds: ['LN001', 'LN002', 'LN003'],
      branchId: 'branch-1',
      newStatus: 'On-Rent',
    })
    for (const e of ev) {
      expect(Number.isNaN(Date.parse(e.scannedAt))).toBe(false)
    }
    const stamps = new Set(ev.map((e) => e.scannedAt))
    expect(stamps.size).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 2. buildStockCheckEvents — pure seam (spec §6)
// ---------------------------------------------------------------------------
describe('buildStockCheckEvents — pure event builder', () => {
  it('returns one stock_check event per tag, in order', () => {
    const ev = buildStockCheckEvents({
      tagIds: ['LN001', 'LN002'],
      branchId: 'branch-1',
    })
    expect(ev).toHaveLength(2)
    expect(ev.map((e) => e.tagId)).toEqual(['LN001', 'LN002'])
    expect(ev.every((e) => e.eventType === 'stock_check')).toBe(true)
  })

  it('sets correct tagId + branchId', () => {
    const ev = buildStockCheckEvents({ tagIds: ['LN001'], branchId: 'branch-7' })
    expect(ev[0]).toMatchObject({
      eventType: 'stock_check',
      tagId: 'LN001',
      branchId: 'branch-7',
    })
  })

  it('emits NO newStatus, NO jobOrderId, NO payload keys', () => {
    const ev = buildStockCheckEvents({ tagIds: ['LN001'], branchId: 'branch-1' })
    expect('newStatus' in ev[0]).toBe(false)
    expect('jobOrderId' in ev[0]).toBe(false)
    expect('payload' in ev[0]).toBe(false)
  })

  it('returns [] for empty tagIds', () => {
    expect(buildStockCheckEvents({ tagIds: [], branchId: 'branch-1' })).toEqual([])
  })

  it('gives every event a distinct, non-empty UUID clientUuid', () => {
    const ev = buildStockCheckEvents({
      tagIds: ['LN001', 'LN002', 'LN003'],
      branchId: 'branch-1',
    })
    for (const e of ev) {
      expect(e.clientUuid).toMatch(UUID_RE)
    }
    expect(new Set(ev.map((e) => e.clientUuid)).size).toBe(ev.length)
  })

  it('stamps a single valid ISO-8601 scannedAt shared by all events', () => {
    const ev = buildStockCheckEvents({
      tagIds: ['LN001', 'LN002'],
      branchId: 'branch-1',
    })
    for (const e of ev) {
      expect(Number.isNaN(Date.parse(e.scannedAt))).toBe(false)
    }
    expect(new Set(ev.map((e) => e.scannedAt)).size).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 3. syncBatch — request shape + results envelope (mocked apiFetch)
// ---------------------------------------------------------------------------
describe('syncBatch — request shape + envelope', () => {
  const events: ScanEventInput[] = buildStatusChangeEvents({
    tagIds: ['LN001'],
    branchId: 'branch-1',
    newStatus: 'On-Rent',
  })

  it('POSTs /sync/batch with { deviceId, events } and returns data.results', async () => {
    const results = [{ clientUuid: events[0].clientUuid, result: 'applied' as const }]
    mockedApiFetch.mockResolvedValue({ results })
    const out = await syncBatch('web-dispatch', events)
    const [path, opts] = lastCall()
    expect(path).toBe('/sync/batch')
    expect(opts?.method).toBe('POST')
    expect(opts?.body).toEqual({ deviceId: 'web-dispatch', events })
    expect(out).toEqual(results)
  })

  it('returns [] when the response has no results field', async () => {
    mockedApiFetch.mockResolvedValue({})
    expect(await syncBatch('web-checkin', events)).toEqual([])
  })
})
