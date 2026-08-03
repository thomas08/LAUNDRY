/**
 * Unit tests for the customer price list API module (lib/api/price-list.ts).
 *
 * Mocks the network boundary (`apiFetch`) and asserts request shape (paths,
 * methods, bodies), the `{ prices }` list envelope unwrap, `buildPriceListQuery`
 * (pure), and `normalize` (pg NUMERIC unitPrice arrives as a string).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(),
}))

import { apiFetch } from '@/lib/api/client'
import {
  fetchPriceList,
  savePrice,
  updatePrice,
  deletePrice,
  buildPriceListQuery,
  normalize,
} from '@/lib/api/price-list'

const mockedApiFetch = vi.mocked(apiFetch)

function lastCall() {
  return mockedApiFetch.mock.calls[mockedApiFetch.mock.calls.length - 1]
}

/** A backend row as pg returns it: NUMERIC unit_price serialized as a string. */
function stringRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cpl-a-day-inn-wash-6sp',
    customerId: 'cust-a-day-inn',
    sku: '6sp',
    productCode: '6',
    sizeCode: '',
    activityCode: 'sp',
    serviceType: 'wash',
    unitPrice: '42.00',
    isActive: true,
    displayName: 'ผ้าปูที่นอน ใหญ่ - กำจัดพิเศษ',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  mockedApiFetch.mockReset()
})

describe('buildPriceListQuery', () => {
  it('is empty with no filters', () => {
    expect(buildPriceListQuery()).toBe('')
    expect(buildPriceListQuery({})).toBe('')
  })

  it('encodes serviceType and includeInactive', () => {
    expect(buildPriceListQuery({ serviceType: 'rental' })).toBe('?serviceType=rental')
    expect(buildPriceListQuery({ includeInactive: true })).toBe('?includeInactive=true')
    expect(buildPriceListQuery({ serviceType: 'wash', includeInactive: true })).toBe(
      '?serviceType=wash&includeInactive=true'
    )
  })

  it('omits includeInactive when false', () => {
    expect(buildPriceListQuery({ includeInactive: false })).toBe('')
  })
})

describe('normalize', () => {
  it('coerces the pg NUMERIC unitPrice string to a number', () => {
    const row = normalize(stringRow())
    expect(row.unitPrice).toBe(42)
    expect(typeof row.unitPrice).toBe('number')
  })

  it('defaults a missing unitPrice to 0 rather than NaN', () => {
    expect(normalize(stringRow({ unitPrice: undefined })).unitPrice).toBe(0)
  })

  it('keeps displayName null when the SKU has no catalog match', () => {
    expect(normalize(stringRow({ displayName: undefined })).displayName).toBeNull()
  })
})

describe('fetchPriceList', () => {
  it('unwraps the { prices } envelope and normalizes rows', async () => {
    mockedApiFetch.mockResolvedValue({ prices: [stringRow(), stringRow({ id: 'x', unitPrice: '9' })] })

    const rows = await fetchPriceList('cust-a-day-inn')

    expect(lastCall()[0]).toBe('/customers/cust-a-day-inn/price-list')
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.unitPrice)).toEqual([42, 9])
  })

  it('returns [] when the envelope has no prices', async () => {
    mockedApiFetch.mockResolvedValue({})
    await expect(fetchPriceList('cust-1')).resolves.toEqual([])
  })

  it('appends the filter query string', async () => {
    mockedApiFetch.mockResolvedValue({ prices: [] })
    await fetchPriceList('cust-1', { serviceType: 'rental' })
    expect(lastCall()[0]).toBe('/customers/cust-1/price-list?serviceType=rental')
  })
})

describe('savePrice', () => {
  it('POSTs the sku/serviceType/unitPrice body', async () => {
    mockedApiFetch.mockResolvedValue(stringRow())

    const row = await savePrice('cust-a-day-inn', { sku: '6SP', serviceType: 'wash', unitPrice: 42 })

    const [path, opts] = lastCall()
    expect(path).toBe('/customers/cust-a-day-inn/price-list')
    expect(opts).toMatchObject({ method: 'POST', body: { sku: '6SP', serviceType: 'wash', unitPrice: 42 } })
    expect(row.unitPrice).toBe(42)
  })
})

describe('updatePrice', () => {
  it('PUTs only the unitPrice to the row path', async () => {
    mockedApiFetch.mockResolvedValue(stringRow({ unitPrice: '45' }))

    const row = await updatePrice('cust-a-day-inn', 'cpl-a-day-inn-wash-6sp', 45)

    const [path, opts] = lastCall()
    expect(path).toBe('/customers/cust-a-day-inn/price-list/cpl-a-day-inn-wash-6sp')
    expect(opts).toMatchObject({ method: 'PUT', body: { unitPrice: 45 } })
    expect(row.unitPrice).toBe(45)
  })
})

describe('deletePrice', () => {
  it('DELETEs the row path', async () => {
    mockedApiFetch.mockResolvedValue(stringRow({ isActive: false }))

    const row = await deletePrice('cust-1', 'cpl-1')

    const [path, opts] = lastCall()
    expect(path).toBe('/customers/cust-1/price-list/cpl-1')
    expect(opts).toMatchObject({ method: 'DELETE' })
    expect(row.isActive).toBe(false)
  })
})
