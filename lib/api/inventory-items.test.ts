/**
 * Unit tests for the Consumable Stock API module (lib/api/inventory-items.ts).
 *
 * Written against the Architect's FINALIZED interface (spec §4 signatures + §8
 * testable seams). Mocks the network boundary (`apiFetch`); asserts request
 * shape (paths, methods, bodies — create body carries no `code`/`currentStock`
 * beyond what the caller passes; movement body is the exact StockMovementInput),
 * the `{ inventoryItems }` / `{ transactions }` list-envelope unwrap, the
 * `{ transaction, item }` movement envelope, `buildInventoryItemsQuery` (pure),
 * and `normalize` / `normalizeTransaction` (pg NUMERIC string → number).
 *
 * Inventory is BRANCH-SCOPED, but scoping is enforced SERVER-side, so the api
 * module sends no branchId on reads — only the create/update body carries one.
 *
 * NOTE: The Implementer's 7 request-function bodies may still be NOT_IMPLEMENTED
 * stubs that throw. Where that is the case, the request-shape/envelope tests
 * below fail because the function throws — "waiting on Implementer", not a
 * harness problem. The pure seams (buildInventoryItemsQuery / normalize /
 * normalizeTransaction) are REAL and pass regardless.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(),
}))

import { apiFetch } from '@/lib/api/client'
import {
  fetchInventoryItems,
  fetchInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  fetchTransactions,
  recordMovement,
  buildInventoryItemsQuery,
  normalize,
  normalizeTransaction,
  type InventoryItemInput,
  type StockMovementInput,
} from '@/lib/api/inventory-items'

const mockedApiFetch = vi.mocked(apiFetch)

function lastCall() {
  return mockedApiFetch.mock.calls[mockedApiFetch.mock.calls.length - 1]
}

/** A full backend inventory-item row: NUMERIC cols as pg strings, nullables null. */
function itemRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    code: 'INV-0001',
    name: 'Detergent Powder',
    nameTh: null,
    nameEn: null,
    type: 'detergent',
    unit: 'kg',
    currentStock: '50.00',
    minimumStock: '100.00',
    maximumStock: null,
    reorderPoint: '120.00',
    unitCost: '85.50',
    supplierId: null,
    supplierName: null,
    branchId: 'BKK01',
    isActive: true,
    alertLevel: 'critical',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

/** A full backend stock_transactions row: NUMERIC cols as pg strings. */
function txRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'stx-1',
    inventoryItemId: 'inv-1',
    type: 'stock_in',
    quantity: '30.00',
    unit: 'kg',
    unitCost: '85.50',
    totalCost: '2565.00',
    referenceType: null,
    referenceId: null,
    fromBranchId: null,
    toBranchId: null,
    branchId: 'BKK01',
    performedBy: 'user-1',
    notes: null,
    createdAt: '2024-01-02T00:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  mockedApiFetch.mockReset()
})

// ---------------------------------------------------------------------------
// 1. buildInventoryItemsQuery — pure seam (spec §8.3)
// ---------------------------------------------------------------------------
describe('buildInventoryItemsQuery — pure querystring builder', () => {
  it('returns "" for no arguments', () => {
    expect(buildInventoryItemsQuery()).toBe('')
  })

  it('returns "" for an empty options object', () => {
    expect(buildInventoryItemsQuery({})).toBe('')
  })

  it('returns "?type=detergent" for a type filter', () => {
    expect(buildInventoryItemsQuery({ type: 'detergent' })).toBe('?type=detergent')
  })

  it('returns "?type=gas&alert=critical" for type + alert', () => {
    expect(buildInventoryItemsQuery({ type: 'gas', alert: 'critical' })).toBe(
      '?type=gas&alert=critical'
    )
  })

  it('returns "?includeInactive=true" when includeInactive is true', () => {
    expect(buildInventoryItemsQuery({ includeInactive: true })).toBe('?includeInactive=true')
  })

  it('omits includeInactive when false', () => {
    expect(buildInventoryItemsQuery({ includeInactive: false })).toBe('')
  })

  it('combines all three filters in order', () => {
    expect(
      buildInventoryItemsQuery({ type: 'bleach', alert: 'low', includeInactive: true })
    ).toBe('?type=bleach&alert=low&includeInactive=true')
  })
})

// ---------------------------------------------------------------------------
// 2. normalize — pure seam (spec §8.4)
// ---------------------------------------------------------------------------
describe('normalize — pg row → InventoryItemWithAlert', () => {
  it('coerces every NUMERIC string column to a real number', () => {
    const i = normalize(itemRow())
    expect(i.currentStock).toBe(50)
    expect(typeof i.currentStock).toBe('number')
    expect(i.minimumStock).toBe(100)
    expect(i.reorderPoint).toBe(120)
    expect(i.unitCost).toBe(85.5)
    expect(typeof i.unitCost).toBe('number')
  })

  it('maps maximumStock null to undefined (optional numeric)', () => {
    expect(normalize(itemRow()).maximumStock).toBeUndefined()
  })

  it('coerces maximumStock string to a number when present', () => {
    expect(normalize(itemRow({ maximumStock: '500.00' })).maximumStock).toBe(500)
  })

  it('leaves nameTh/nameEn/supplierId/supplierName undefined when null', () => {
    const i = normalize(itemRow())
    expect(i.nameTh).toBeUndefined()
    expect(i.nameEn).toBeUndefined()
    expect(i.supplierId).toBeUndefined()
    expect(i.supplierName).toBeUndefined()
  })

  it('passes alertLevel through unchanged', () => {
    expect(normalize(itemRow()).alertLevel).toBe('critical')
    expect(normalize(itemRow({ alertLevel: 'out_of_stock' })).alertLevel).toBe('out_of_stock')
  })

  it('defaults a missing alertLevel to "ok"', () => {
    const row = itemRow()
    delete (row as any).alertLevel
    expect(normalize(row).alertLevel).toBe('ok')
  })

  it('coerces isActive to a boolean', () => {
    const i = normalize(itemRow({ isActive: true }))
    expect(i.isActive).toBe(true)
    expect(typeof i.isActive).toBe('boolean')
  })

  it('passes id/code/name/type/unit/branchId/timestamps through unchanged', () => {
    const i = normalize(itemRow())
    expect(i.id).toBe('inv-1')
    expect(i.code).toBe('INV-0001')
    expect(i.name).toBe('Detergent Powder')
    expect(i.type).toBe('detergent')
    expect(i.unit).toBe('kg')
    expect(i.branchId).toBe('BKK01')
    expect(i.createdAt).toBe('2024-01-01T00:00:00Z')
    expect(i.updatedAt).toBe('2024-01-01T00:00:00Z')
  })

  it('preserves populated optional fields (does not clobber non-null values)', () => {
    const i = normalize(itemRow({ nameTh: 'ผงซักฟอก', supplierId: 'sup-1', supplierName: 'Prima' }))
    expect(i.nameTh).toBe('ผงซักฟอก')
    expect(i.supplierId).toBe('sup-1')
    expect(i.supplierName).toBe('Prima')
  })
})

// ---------------------------------------------------------------------------
// 3. normalizeTransaction — pure seam (spec §8.4)
// ---------------------------------------------------------------------------
describe('normalizeTransaction — pg row → StockTransaction', () => {
  it('coerces quantity/unitCost/totalCost strings to numbers', () => {
    const t = normalizeTransaction(txRow())
    expect(t.quantity).toBe(30)
    expect(typeof t.quantity).toBe('number')
    expect(t.unitCost).toBe(85.5)
    expect(t.totalCost).toBe(2565)
  })

  it('maps null reference/branch/notes fields to undefined', () => {
    const t = normalizeTransaction(txRow())
    expect(t.referenceType).toBeUndefined()
    expect(t.referenceId).toBeUndefined()
    expect(t.fromBranchId).toBeUndefined()
    expect(t.toBranchId).toBeUndefined()
    expect(t.notes).toBeUndefined()
  })

  it('passes id/inventoryItemId/type/unit/branchId/performedBy/createdAt through', () => {
    const t = normalizeTransaction(txRow())
    expect(t.id).toBe('stx-1')
    expect(t.inventoryItemId).toBe('inv-1')
    expect(t.type).toBe('stock_in')
    expect(t.unit).toBe('kg')
    expect(t.branchId).toBe('BKK01')
    expect(t.performedBy).toBe('user-1')
    expect(t.createdAt).toBe('2024-01-02T00:00:00Z')
  })

  it('preserves populated reference/notes fields', () => {
    const t = normalizeTransaction(
      txRow({ referenceType: 'manual', referenceId: 'ref-9', notes: 'restock' })
    )
    expect(t.referenceType).toBe('manual')
    expect(t.referenceId).toBe('ref-9')
    expect(t.notes).toBe('restock')
  })
})

// ---------------------------------------------------------------------------
// 4. fetchInventoryItems — request shape + { inventoryItems } envelope (spec §4)
// ---------------------------------------------------------------------------
describe('fetchInventoryItems — request shape', () => {
  it('GETs /inventory-items with NO querystring when no filters', async () => {
    mockedApiFetch.mockResolvedValue({ inventoryItems: [] })
    await fetchInventoryItems()
    expect(lastCall()[0]).toBe('/inventory-items')
  })

  it('appends ?type=detergent&alert=low from the filters', async () => {
    mockedApiFetch.mockResolvedValue({ inventoryItems: [] })
    await fetchInventoryItems({ type: 'detergent', alert: 'low' })
    expect(lastCall()[0]).toBe('/inventory-items?type=detergent&alert=low')
  })
})

describe('fetchInventoryItems — list envelope unwrap', () => {
  it('maps { inventoryItems: [...] } to a plain normalized array', async () => {
    mockedApiFetch.mockResolvedValue({ inventoryItems: [itemRow(), itemRow({ id: 'inv-2' })] })
    const out = await fetchInventoryItems()
    expect(Array.isArray(out)).toBe(true)
    expect(out).toHaveLength(2)
    expect(out[0].currentStock).toBe(50) // normalized
  })

  it('returns [] when the list is missing/undefined', async () => {
    mockedApiFetch.mockResolvedValue({})
    expect(await fetchInventoryItems()).toEqual([])
    mockedApiFetch.mockResolvedValue({ inventoryItems: undefined })
    expect(await fetchInventoryItems()).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 5. fetchInventoryItem — single GET, no envelope (spec §4)
// ---------------------------------------------------------------------------
describe('fetchInventoryItem — single fetch', () => {
  it('GETs /inventory-items/:id and normalizes the single object', async () => {
    mockedApiFetch.mockResolvedValue(itemRow())
    const i = await fetchInventoryItem('inv-1')
    expect(lastCall()[0]).toBe('/inventory-items/inv-1')
    expect(i.currentStock).toBe(50)
    expect(i.unitCost).toBe(85.5)
  })
})

// ---------------------------------------------------------------------------
// 6. createInventoryItem — POST body (spec §3/§4)
// ---------------------------------------------------------------------------
describe('createInventoryItem — mutation shape', () => {
  const input: InventoryItemInput = {
    name: 'Softener',
    type: 'softener',
    unit: 'liter',
    minimumStock: 50,
    reorderPoint: 80,
    unitCost: 42.5,
    branchId: 'BKK01',
  }

  it('POSTs to /inventory-items with the input body and normalizes the result', async () => {
    mockedApiFetch.mockResolvedValue(itemRow())
    const i = await createInventoryItem(input)
    const [path, opts] = lastCall()
    expect(path).toBe('/inventory-items')
    expect(opts?.method).toBe('POST')
    expect(opts?.body).toEqual(input)
    expect(i.currentStock).toBe(50)
  })

  it('does NOT inject a code the caller did not supply', async () => {
    mockedApiFetch.mockResolvedValue(itemRow())
    await createInventoryItem(input)
    const [, opts] = lastCall()
    expect(opts?.body as Record<string, unknown>).not.toHaveProperty('code')
  })

  it('carries branchId in the create body (branch-scoped resource)', async () => {
    mockedApiFetch.mockResolvedValue(itemRow())
    await createInventoryItem(input)
    const body = lastCall()[1]?.body as Record<string, unknown>
    expect(body.branchId).toBe('BKK01')
  })
})

// ---------------------------------------------------------------------------
// 7. updateInventoryItem — PUT partial body (spec §3/§4)
// ---------------------------------------------------------------------------
describe('updateInventoryItem — mutation shape', () => {
  it('PUTs to /inventory-items/:id with a partial body', async () => {
    mockedApiFetch.mockResolvedValue(itemRow({ minimumStock: '75.00' }))
    const i = await updateInventoryItem('inv-1', { minimumStock: 75 })
    const [path, opts] = lastCall()
    expect(path).toBe('/inventory-items/inv-1')
    expect(opts?.method).toBe('PUT')
    expect(opts?.body).toEqual({ minimumStock: 75 })
    expect(i.minimumStock).toBe(75)
  })

  it('passes the partial body through untouched (no injected code/currentStock)', async () => {
    mockedApiFetch.mockResolvedValue(itemRow())
    await updateInventoryItem('inv-1', { name: 'Renamed' })
    const body = lastCall()[1]?.body as Record<string, unknown>
    expect(body).toEqual({ name: 'Renamed' })
    expect(body).not.toHaveProperty('code')
    expect(body).not.toHaveProperty('currentStock')
  })
})

// ---------------------------------------------------------------------------
// 8. deleteInventoryItem — DELETE soft-delete (spec §3/§4)
// ---------------------------------------------------------------------------
describe('deleteInventoryItem — soft delete', () => {
  it('DELETEs /inventory-items/:id and returns the normalized deactivated row', async () => {
    mockedApiFetch.mockResolvedValue(itemRow({ isActive: false }))
    const i = await deleteInventoryItem('inv-1')
    const [path, opts] = lastCall()
    expect(path).toBe('/inventory-items/inv-1')
    expect(opts?.method).toBe('DELETE')
    expect(i.isActive).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 9. fetchTransactions — GET + { transactions } envelope (spec §4)
// ---------------------------------------------------------------------------
describe('fetchTransactions — ledger list', () => {
  it('GETs /inventory-items/:id/transactions', async () => {
    mockedApiFetch.mockResolvedValue({ transactions: [] })
    await fetchTransactions('inv-1')
    expect(lastCall()[0]).toBe('/inventory-items/inv-1/transactions')
  })

  it('maps { transactions: [...] } to a normalized array', async () => {
    mockedApiFetch.mockResolvedValue({ transactions: [txRow(), txRow({ id: 'stx-2' })] })
    const out = await fetchTransactions('inv-1')
    expect(out).toHaveLength(2)
    expect(out[0].quantity).toBe(30) // normalized
  })

  it('returns [] when the list is missing/undefined', async () => {
    mockedApiFetch.mockResolvedValue({})
    expect(await fetchTransactions('inv-1')).toEqual([])
    mockedApiFetch.mockResolvedValue({ transactions: undefined })
    expect(await fetchTransactions('inv-1')).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 10. recordMovement — POST movement + { transaction, item } envelope (spec §4)
// ---------------------------------------------------------------------------
describe('recordMovement — stock movement', () => {
  const input: StockMovementInput = {
    type: 'stock_out',
    quantity: 20,
    unitCost: 85.5,
    notes: 'used in wash',
  }

  it('POSTs the exact movement body to /inventory-items/:id/transactions', async () => {
    mockedApiFetch.mockResolvedValue({ transaction: txRow(), item: itemRow() })
    await recordMovement('inv-1', input)
    const [path, opts] = lastCall()
    expect(path).toBe('/inventory-items/inv-1/transactions')
    expect(opts?.method).toBe('POST')
    expect(opts?.body).toEqual(input)
  })

  it('returns { transaction, item } with BOTH normalized', async () => {
    mockedApiFetch.mockResolvedValue({
      transaction: txRow({ type: 'stock_out', quantity: '20.00', totalCost: '1710.00' }),
      item: itemRow({ currentStock: '30.00', alertLevel: 'out_of_stock' }),
    })
    const r = await recordMovement('inv-1', input)
    expect(r.transaction.quantity).toBe(20)
    expect(r.transaction.totalCost).toBe(1710)
    expect(typeof r.transaction.totalCost).toBe('number')
    expect(r.item.currentStock).toBe(30)
    expect(r.item.alertLevel).toBe('out_of_stock')
  })
})
