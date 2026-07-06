/**
 * Unit tests for the Suppliers API module (lib/api/suppliers.ts).
 *
 * Written against the Architect's FINALIZED interface (spec section (f) seams).
 * Mocks the network boundary (`apiFetch`); asserts request shape (paths, methods,
 * bodies — and that create/update bodies never carry `code`/`branchId`), the
 * `{ suppliers }` list envelope unwrap, `buildSuppliersQuery` (pure), and
 * `normalize` (null→''/undefined + paymentTerms string→number coercion).
 *
 * Suppliers are ORG-GLOBAL: no branch scoping anywhere.
 *
 * NOTE: While the Implementer's 5 request bodies are still NOT_IMPLEMENTED stubs,
 * the behavior tests below fail because those functions throw — "waiting on
 * Implementer", not a harness problem. `buildSuppliersQuery`/`normalize` are REAL
 * seams and pass regardless.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(),
}))

import { apiFetch } from '@/lib/api/client'
import {
  fetchSuppliers,
  fetchSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  buildSuppliersQuery,
  normalize,
  type SupplierInput,
} from '@/lib/api/suppliers'

const mockedApiFetch = vi.mocked(apiFetch)

function lastCall() {
  return mockedApiFetch.mock.calls[mockedApiFetch.mock.calls.length - 1]
}

/** A full backend row: nullable text cols as null, paymentTerms as a pg string. */
function stringRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sup-1',
    code: 'SUP-0001',
    name: 'Prima',
    nameTh: null,
    nameEn: null,
    contactPerson: null,
    email: null,
    phone: null,
    address: null,
    taxId: null,
    paymentTerms: '30',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  mockedApiFetch.mockReset()
})

// ---------------------------------------------------------------------------
// 1. buildSuppliersQuery — pure seam (spec (f).1)
// ---------------------------------------------------------------------------
describe('buildSuppliersQuery — pure querystring builder', () => {
  it('returns "" for no options', () => {
    expect(buildSuppliersQuery()).toBe('')
  })

  it('returns "" for an empty options object', () => {
    expect(buildSuppliersQuery({})).toBe('')
  })

  it('returns "" when includeInactive is false', () => {
    expect(buildSuppliersQuery({ includeInactive: false })).toBe('')
  })

  it('returns "?includeInactive=true" when includeInactive is true', () => {
    expect(buildSuppliersQuery({ includeInactive: true })).toBe('?includeInactive=true')
  })
})

// ---------------------------------------------------------------------------
// 2. normalize — pure seam (spec (f).2)
// ---------------------------------------------------------------------------
describe('normalize — pg row → Supplier', () => {
  it('coerces null text cols to empty strings (contactPerson/email/phone/address)', () => {
    const s = normalize(stringRow())
    expect(s.contactPerson).toBe('')
    expect(s.email).toBe('')
    expect(s.phone).toBe('')
    expect(s.address).toBe('')
  })

  it('leaves nameTh/nameEn/taxId as undefined when null', () => {
    const s = normalize(stringRow())
    expect(s.nameTh).toBeUndefined()
    expect(s.nameEn).toBeUndefined()
    expect(s.taxId).toBeUndefined()
  })

  it('coerces paymentTerms string "30" to the number 30', () => {
    const s = normalize(stringRow())
    expect(s.paymentTerms).toBe(30)
    expect(typeof s.paymentTerms).toBe('number')
  })

  it('maps paymentTerms null to undefined (edge case)', () => {
    const s = normalize(stringRow({ paymentTerms: null }))
    expect(s.paymentTerms).toBeUndefined()
  })

  it('coerces isActive to a boolean', () => {
    expect(normalize(stringRow({ isActive: true })).isActive).toBe(true)
    expect(typeof normalize(stringRow({ isActive: true })).isActive).toBe('boolean')
  })

  it('passes id/code/name/createdAt/updatedAt through unchanged', () => {
    const s = normalize(stringRow())
    expect(s.id).toBe('sup-1')
    expect(s.code).toBe('SUP-0001')
    expect(s.name).toBe('Prima')
    expect(s.createdAt).toBe('2024-01-01T00:00:00Z')
    expect(s.updatedAt).toBe('2024-01-01T00:00:00Z')
  })

  it('preserves populated optional fields (does not clobber non-null values)', () => {
    const s = normalize(
      stringRow({ nameTh: 'พรีมา', taxId: '1234567890', contactPerson: 'Somchai' })
    )
    expect(s.nameTh).toBe('พรีมา')
    expect(s.taxId).toBe('1234567890')
    expect(s.contactPerson).toBe('Somchai')
  })
})

// ---------------------------------------------------------------------------
// 3. fetchSuppliers — request shape + list envelope (spec (f).3, (b) GET list)
// ---------------------------------------------------------------------------
describe('fetchSuppliers — request shape', () => {
  it('calls /suppliers with NO querystring when no options', async () => {
    mockedApiFetch.mockResolvedValue({ suppliers: [] })
    await fetchSuppliers()
    expect(lastCall()[0]).toBe('/suppliers')
  })

  it('appends ?includeInactive=true when requested', async () => {
    mockedApiFetch.mockResolvedValue({ suppliers: [] })
    await fetchSuppliers({ includeInactive: true })
    expect(lastCall()[0]).toBe('/suppliers?includeInactive=true')
  })
})

describe('fetchSuppliers — list envelope unwrap', () => {
  it('maps { suppliers: [...] } to a plain array', async () => {
    mockedApiFetch.mockResolvedValue({ suppliers: [stringRow(), stringRow({ id: 'sup-2' })] })
    const out = await fetchSuppliers()
    expect(Array.isArray(out)).toBe(true)
    expect(out).toHaveLength(2)
  })

  it('returns [] when the list is missing/undefined', async () => {
    mockedApiFetch.mockResolvedValue({})
    expect(await fetchSuppliers()).toEqual([])
    mockedApiFetch.mockResolvedValue({ suppliers: undefined })
    expect(await fetchSuppliers()).toEqual([])
  })

  it('normalizes each row in the list (paymentTerms coerced)', async () => {
    mockedApiFetch.mockResolvedValue({ suppliers: [stringRow()] })
    const [s] = await fetchSuppliers()
    expect(s.paymentTerms).toBe(30)
    expect(s.contactPerson).toBe('')
  })
})

// ---------------------------------------------------------------------------
// 4. fetchSupplier — single GET, no envelope (spec (b) GET :id)
// ---------------------------------------------------------------------------
describe('fetchSupplier — single fetch', () => {
  it('GETs /suppliers/:id and normalizes the single object', async () => {
    mockedApiFetch.mockResolvedValue(stringRow())
    const s = await fetchSupplier('sup-1')
    expect(lastCall()[0]).toBe('/suppliers/sup-1')
    expect(s.paymentTerms).toBe(30)
    expect(s.email).toBe('')
  })
})

// ---------------------------------------------------------------------------
// 5. createSupplier — POST, body excludes code/branchId (spec (b) POST, checklist)
// ---------------------------------------------------------------------------
describe('createSupplier — mutation shape', () => {
  const input: SupplierInput = {
    name: 'Prima Chemicals',
    contactPerson: 'Somchai',
    email: 'sales@prima.co.th',
    phone: '021234567',
    paymentTerms: 30,
  }

  it('POSTs to /suppliers with the input body and normalizes the result', async () => {
    mockedApiFetch.mockResolvedValue(stringRow())
    const s = await createSupplier(input)
    const [path, opts] = lastCall()
    expect(path).toBe('/suppliers')
    expect(opts?.method).toBe('POST')
    expect(opts?.body).toEqual(input)
    expect(s.paymentTerms).toBe(30)
  })

  it('does NOT include code or branchId in the POST body', async () => {
    mockedApiFetch.mockResolvedValue(stringRow())
    await createSupplier(input)
    const [, opts] = lastCall()
    const body = opts?.body as Record<string, unknown>
    expect(body).not.toHaveProperty('code')
    expect(body).not.toHaveProperty('branchId')
  })
})

// ---------------------------------------------------------------------------
// 6. updateSupplier — PUT, partial body (spec (b) PUT)
// ---------------------------------------------------------------------------
describe('updateSupplier — mutation shape', () => {
  it('PUTs to /suppliers/:id with a partial body', async () => {
    mockedApiFetch.mockResolvedValue(stringRow({ paymentTerms: '45' }))
    const s = await updateSupplier('sup-1', { paymentTerms: 45 })
    const [path, opts] = lastCall()
    expect(path).toBe('/suppliers/sup-1')
    expect(opts?.method).toBe('PUT')
    expect(opts?.body).toEqual({ paymentTerms: 45 })
    expect(s.paymentTerms).toBe(45)
  })

  it('does NOT inject code or branchId into the PUT body', async () => {
    mockedApiFetch.mockResolvedValue(stringRow())
    await updateSupplier('sup-1', { name: 'Renamed' })
    const [, opts] = lastCall()
    const body = opts?.body as Record<string, unknown>
    expect(body).toEqual({ name: 'Renamed' })
    expect(body).not.toHaveProperty('code')
    expect(body).not.toHaveProperty('branchId')
  })
})

// ---------------------------------------------------------------------------
// 7. deleteSupplier — DELETE soft-delete (spec (b) DELETE)
// ---------------------------------------------------------------------------
describe('deleteSupplier — soft delete', () => {
  it('DELETEs /suppliers/:id and returns the normalized deactivated row', async () => {
    mockedApiFetch.mockResolvedValue(stringRow({ isActive: false }))
    const s = await deleteSupplier('sup-1')
    const [path, opts] = lastCall()
    expect(path).toBe('/suppliers/sup-1')
    expect(opts?.method).toBe('DELETE')
    expect(s.isActive).toBe(false)
  })
})
