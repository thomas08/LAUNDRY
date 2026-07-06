/**
 * Unit tests for the Invoices API module (lib/api/invoices.ts).
 *
 * Written against the Architect's FINALIZED interface (spec seams T2/T3).
 * Mocks the network boundary (`apiFetch`); asserts request shape + numeric
 * coercion of the 7 money/rate fields + passthrough of jobOrderIds/customerName.
 *
 * NOTE: While the Implementer's bodies are still NOT_IMPLEMENTED stubs, these
 * behavior tests fail because the functions throw — "waiting on Implementer",
 * not a harness problem.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(),
}))

import { apiFetch } from '@/lib/api/client'
import {
  fetchInvoices,
  fetchInvoice,
  createInvoice,
  updateInvoice,
  recordInvoicePayment,
  updateInvoiceStatus,
  cancelInvoice,
  type InvoiceInput,
} from '@/lib/api/invoices'

const mockedApiFetch = vi.mocked(apiFetch)

function lastCall() {
  return mockedApiFetch.mock.calls[mockedApiFetch.mock.calls.length - 1]
}

/** A full backend row with every money/rate field as a pg NUMERIC string. */
function stringRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv1',
    invoiceNumber: 'INV-2026-0001',
    customerId: 'c1',
    customerName: 'Hotel A',
    createdBy: 'u1',
    jobOrderIds: ['a', 'b'],
    subtotal: '1200.00',
    vatRate: '0.07',
    vatAmount: '84.00',
    discount: '0.00',
    totalAmount: '1284.00',
    paidAmount: '0.00',
    remainingAmount: '1284.00',
    status: 'issued',
    ...overrides,
  }
}

beforeEach(() => {
  mockedApiFetch.mockReset()
})

describe('fetchInvoices — request shape (T3)', () => {
  it('calls /invoices with NO querystring when no filters', async () => {
    mockedApiFetch.mockResolvedValue({ invoices: [] })
    await fetchInvoices()
    expect(lastCall()[0]).toBe('/invoices')
  })

  it('encodes a single status filter', async () => {
    mockedApiFetch.mockResolvedValue({ invoices: [] })
    await fetchInvoices({ status: 'overdue' })
    expect(lastCall()[0]).toBe('/invoices?status=overdue')
  })

  it('encodes status + customerId, URL-encoding the customerId (space → +)', async () => {
    mockedApiFetch.mockResolvedValue({ invoices: [] })
    await fetchInvoices({ status: 'issued', customerId: 'c 1' })
    expect(lastCall()[0]).toBe('/invoices?status=issued&customerId=c+1')
  })
})

describe('fetchInvoices — list envelope unwrap (T3)', () => {
  it('maps { invoices: [...] } to a plain array', async () => {
    mockedApiFetch.mockResolvedValue({ invoices: [stringRow(), stringRow({ id: 'inv2' })] })
    const out = await fetchInvoices()
    expect(Array.isArray(out)).toBe(true)
    expect(out).toHaveLength(2)
  })

  it('returns [] when the list is missing/undefined', async () => {
    mockedApiFetch.mockResolvedValue({})
    expect(await fetchInvoices()).toEqual([])
    mockedApiFetch.mockResolvedValue({ invoices: undefined })
    expect(await fetchInvoices()).toEqual([])
  })
})

describe('normalize (via fetchInvoices) — numeric coercion (T2)', () => {
  it('coerces all 7 money/rate string fields to numbers', async () => {
    mockedApiFetch.mockResolvedValue({ invoices: [stringRow()] })
    const [inv] = await fetchInvoices()
    expect(inv.subtotal).toBe(1200)
    expect(inv.vatRate).toBe(0.07)
    expect(inv.vatAmount).toBe(84)
    expect(inv.discount).toBe(0)
    expect(inv.totalAmount).toBe(1284)
    expect(inv.paidAmount).toBe(0)
    expect(inv.remainingAmount).toBe(1284)
    for (const k of [
      'subtotal',
      'vatRate',
      'vatAmount',
      'discount',
      'totalAmount',
      'paidAmount',
      'remainingAmount',
    ] as const) {
      expect(typeof inv[k]).toBe('number')
    }
  })

  it('keeps vatRate as a FRACTION (0.07), not a percent', async () => {
    mockedApiFetch.mockResolvedValue({ invoices: [stringRow({ vatRate: '0.07' })] })
    const [inv] = await fetchInvoices()
    expect(inv.vatRate).toBe(0.07)
    expect(inv.vatRate).toBeLessThan(1)
  })

  it('passes jobOrderIds through unchanged (array, not coerced)', async () => {
    mockedApiFetch.mockResolvedValue({ invoices: [stringRow({ jobOrderIds: ['a', 'b'] })] })
    const [inv] = await fetchInvoices()
    expect(inv.jobOrderIds).toEqual(['a', 'b'])
  })

  it('passes customerName (nullable) and createdBy through (InvoiceRow fields)', async () => {
    mockedApiFetch.mockResolvedValue({
      invoices: [stringRow({ customerName: null, createdBy: 'u1' })],
    })
    const [inv] = await fetchInvoices()
    expect(inv.customerName).toBeNull()
    expect(inv.createdBy).toBe('u1')
  })

  it('passes null money fields through untouched (not 0)', async () => {
    mockedApiFetch.mockResolvedValue({ invoices: [stringRow({ discount: null })] })
    const [inv] = await fetchInvoices()
    expect(inv.discount).toBeNull()
  })
})

describe('fetchInvoice — single fetch (T3)', () => {
  it('GETs /invoices/:id and normalizes the single object', async () => {
    mockedApiFetch.mockResolvedValue(stringRow())
    const inv = await fetchInvoice('inv1')
    expect(lastCall()[0]).toBe('/invoices/inv1')
    expect(inv.totalAmount).toBe(1284)
    expect(typeof inv.subtotal).toBe('number')
  })
})

describe('createInvoice — mutation shape (T3)', () => {
  const input: InvoiceInput = {
    customerId: 'c1',
    branchId: 'BKK01',
    jobOrderIds: ['a', 'b'],
    vatRate: 0.07,
  }

  it('POSTs to /invoices with the input body and normalizes the result', async () => {
    mockedApiFetch.mockResolvedValue(stringRow())
    const inv = await createInvoice(input)
    const [path, opts] = lastCall()
    expect(path).toBe('/invoices')
    expect(opts?.method).toBe('POST')
    expect(opts?.body).toEqual(input)
    expect(inv.totalAmount).toBe(1284)
  })
})

describe('updateInvoice — mutation shape (T3)', () => {
  it('PUTs to /invoices/:id with a partial body', async () => {
    mockedApiFetch.mockResolvedValue(stringRow({ discount: '100.00' }))
    await updateInvoice('inv1', { discount: 100 })
    const [path, opts] = lastCall()
    expect(path).toBe('/invoices/inv1')
    expect(opts?.method).toBe('PUT')
    expect(opts?.body).toEqual({ discount: 100 })
  })
})

describe('recordInvoicePayment — PATCH /payment (T3)', () => {
  it('PATCHes /invoices/:id/payment with { amount }', async () => {
    mockedApiFetch.mockResolvedValue(
      stringRow({ paidAmount: '1284.00', remainingAmount: '0.00', status: 'paid' })
    )
    const inv = await recordInvoicePayment('inv1', 1284)
    const [path, opts] = lastCall()
    expect(path).toBe('/invoices/inv1/payment')
    expect(opts?.method).toBe('PATCH')
    expect(opts?.body).toEqual({ amount: 1284 })
    expect(inv.paidAmount).toBe(1284)
    expect(inv.remainingAmount).toBe(0)
  })
})

describe('updateInvoiceStatus — PATCH /status (T3)', () => {
  it('PATCHes /invoices/:id/status with { status }', async () => {
    mockedApiFetch.mockResolvedValue(stringRow({ status: 'paid' }))
    await updateInvoiceStatus('inv1', 'paid')
    const [path, opts] = lastCall()
    expect(path).toBe('/invoices/inv1/status')
    expect(opts?.method).toBe('PATCH')
    expect(opts?.body).toEqual({ status: 'paid' })
  })
})

describe('cancelInvoice — DELETE (soft cancel) (T3)', () => {
  it('DELETEs /invoices/:id and returns the normalized cancelled row', async () => {
    mockedApiFetch.mockResolvedValue(stringRow({ status: 'cancelled' }))
    const inv = await cancelInvoice('inv1')
    const [path, opts] = lastCall()
    expect(path).toBe('/invoices/inv1')
    expect(opts?.method).toBe('DELETE')
    expect(inv.status).toBe('cancelled')
  })
})
