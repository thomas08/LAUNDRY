/**
 * Unit tests for the Expenses API module (lib/api/expenses.ts).
 *
 * These tests are written by the Tester against the Architect's FINALIZED
 * interface (spec: finance-integration-spec.md, seams T1/T3). They mock the
 * network boundary (`apiFetch`) and assert request shape + numeric coercion, so
 * they exercise no real backend and pass once the spec-conformant bodies land.
 *
 * NOTE: While the Implementer's bodies are still NOT_IMPLEMENTED stubs, the
 * "public behavior" tests below will fail because the functions throw. Those
 * failures are "waiting on Implementer", not harness problems.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the network boundary. The finance module imports { apiFetch } from './client'.
vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(),
}))

import { apiFetch } from '@/lib/api/client'
import {
  fetchExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  type ExpenseInput,
} from '@/lib/api/expenses'

const mockedApiFetch = vi.mocked(apiFetch)

/** Convenience: the args of the most recent apiFetch call as [path, options?]. */
function lastCall() {
  return mockedApiFetch.mock.calls[mockedApiFetch.mock.calls.length - 1]
}

beforeEach(() => {
  mockedApiFetch.mockReset()
})

describe('fetchExpenses — request shape (T3)', () => {
  it('calls /expenses with NO querystring when no filters', async () => {
    mockedApiFetch.mockResolvedValue({ expenses: [] })
    await fetchExpenses()
    expect(lastCall()[0]).toBe('/expenses')
  })

  it('calls /expenses with NO querystring for an empty filter object', async () => {
    mockedApiFetch.mockResolvedValue({ expenses: [] })
    await fetchExpenses({})
    expect(lastCall()[0]).toBe('/expenses')
  })

  it('encodes a single category filter', async () => {
    mockedApiFetch.mockResolvedValue({ expenses: [] })
    await fetchExpenses({ category: 'materials' })
    expect(lastCall()[0]).toBe('/expenses?category=materials')
  })

  it('encodes both category + paymentMethod filters', async () => {
    mockedApiFetch.mockResolvedValue({ expenses: [] })
    await fetchExpenses({ category: 'labor', paymentMethod: 'cash' })
    expect(lastCall()[0]).toBe('/expenses?category=labor&paymentMethod=cash')
  })

  it('is a GET (no method/body options implies a read)', async () => {
    mockedApiFetch.mockResolvedValue({ expenses: [] })
    await fetchExpenses()
    const opts = lastCall()[1]
    // job-orders.ts pattern: reads pass no options (or no method), never POST/PUT.
    expect(opts?.method ?? 'GET').toBe('GET')
  })
})

describe('fetchExpenses — list envelope unwrap (T3)', () => {
  it('maps { expenses: [...] } to a plain array', async () => {
    mockedApiFetch.mockResolvedValue({
      expenses: [
        { id: 'a', amount: '10', vatAmount: '1', totalAmount: '11' },
        { id: 'b', amount: '20', vatAmount: '2', totalAmount: '22' },
      ],
    })
    const out = await fetchExpenses()
    expect(Array.isArray(out)).toBe(true)
    expect(out).toHaveLength(2)
    expect(out[0].id).toBe('a')
  })

  it('returns [] when the list is missing/undefined (|| [] guard)', async () => {
    mockedApiFetch.mockResolvedValue({})
    expect(await fetchExpenses()).toEqual([])
    mockedApiFetch.mockResolvedValue({ expenses: undefined })
    expect(await fetchExpenses()).toEqual([])
  })
})

describe('normalize (via fetchExpenses) — numeric coercion (T1)', () => {
  it('coerces amount/vatAmount/totalAmount pg-strings to real numbers', async () => {
    mockedApiFetch.mockResolvedValue({
      expenses: [
        { id: 'x', amount: '15000', vatAmount: '1050', totalAmount: '16050' },
      ],
    })
    const [e] = await fetchExpenses()
    expect(e.amount).toBe(15000)
    expect(e.vatAmount).toBe(1050)
    expect(e.totalAmount).toBe(16050)
    expect(typeof e.amount).toBe('number')
    expect(typeof e.vatAmount).toBe('number')
    expect(typeof e.totalAmount).toBe('number')
  })

  it('passes null through untouched (num() returns null, not 0)', async () => {
    mockedApiFetch.mockResolvedValue({
      expenses: [{ id: 'x', amount: '10', vatAmount: null, totalAmount: '10' }],
    })
    const [e] = await fetchExpenses()
    expect(e.vatAmount).toBeNull()
    expect(e.amount).toBe(10)
  })

  it('preserves non-money fields (Number coercion is field-scoped)', async () => {
    mockedApiFetch.mockResolvedValue({
      expenses: [
        {
          id: 'x',
          category: 'utilities',
          description: 'Electric bill',
          paymentDate: '2026-07-01',
          amount: '500',
          vatAmount: '35',
          totalAmount: '535',
        },
      ],
    })
    const [e] = await fetchExpenses()
    expect(e.category).toBe('utilities')
    expect(e.description).toBe('Electric bill')
    expect(e.paymentDate).toBe('2026-07-01')
  })
})

describe('createExpense — mutation shape (T3) + coercion', () => {
  const input: ExpenseInput = {
    category: 'materials',
    description: 'Detergent',
    amount: 15000,
    vatAmount: 1050,
    branchId: 'BKK01',
  }

  it('POSTs to /expenses with the input as the body', async () => {
    mockedApiFetch.mockResolvedValue({
      id: 'e1',
      amount: '15000',
      vatAmount: '1050',
      totalAmount: '16050',
    })
    await createExpense(input)
    const [path, opts] = lastCall()
    expect(path).toBe('/expenses')
    expect(opts?.method).toBe('POST')
    expect(opts?.body).toEqual(input)
  })

  it('normalizes the single created object (string amounts → numbers)', async () => {
    mockedApiFetch.mockResolvedValue({
      id: 'e1',
      amount: '15000',
      vatAmount: '1050',
      totalAmount: '16050',
    })
    const e = await createExpense(input)
    expect(e.amount).toBe(15000)
    expect(e.totalAmount).toBe(16050)
    expect(typeof e.totalAmount).toBe('number')
  })
})

describe('updateExpense — mutation shape (T3)', () => {
  it('PUTs to /expenses/:id with a partial body', async () => {
    mockedApiFetch.mockResolvedValue({
      id: 'e1',
      amount: '20000',
      vatAmount: '1400',
      totalAmount: '21400',
    })
    await updateExpense('e1', { amount: 20000 })
    const [path, opts] = lastCall()
    expect(path).toBe('/expenses/e1')
    expect(opts?.method).toBe('PUT')
    expect(opts?.body).toEqual({ amount: 20000 })
  })
})

describe('deleteExpense — mutation shape (T3)', () => {
  it('DELETEs /expenses/:id and resolves void (ignores { ok: true })', async () => {
    mockedApiFetch.mockResolvedValue({ ok: true })
    const result = await deleteExpense('e1')
    const [path, opts] = lastCall()
    expect(path).toBe('/expenses/e1')
    expect(opts?.method).toBe('DELETE')
    expect(result).toBeUndefined()
  })
})
