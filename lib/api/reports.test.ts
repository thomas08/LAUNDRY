/**
 * Unit tests for the Reports / Analytics API module (lib/api/reports.ts).
 *
 * Written against the Architect's FINALIZED interface (spec §(c) signatures +
 * §(f) testable seams). Mocks the network boundary (`apiFetch`); asserts:
 *   - buildReportsQuery (pure): path/querystring per filter combo, "" when empty
 *   - normalize / normalizeSalesRow / normalizeCostRow (pure): pg NUMERIC/COUNT
 *     string → number, and a `null` %-change PRESERVED as null (not coerced to 0)
 *   - request shape: the 3 fetchers hit the right paths with the built query
 *   - envelope unwrap: { salesByService } / { costByCategory } → normalized array,
 *     empty/missing → []
 *
 * Reports are BRANCH-SCOPED, but scoping is enforced SERVER-side, so branchId is
 * only ever a querystring filter — never client-side filtering.
 *
 * NOTE: The Implementer's 3 request-function bodies may still be NOT_IMPLEMENTED
 * stubs that throw. Where that is the case, the request-shape/envelope tests
 * below fail because the function throws — "waiting on Implementer", not a
 * harness problem. The pure seams (buildReportsQuery / normalize / *Row) are REAL
 * and pass regardless.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(),
}))

import { apiFetch } from '@/lib/api/client'
import {
  fetchSummary,
  fetchSalesByService,
  fetchCostByCategory,
  buildReportsQuery,
  normalize,
  normalizeSalesRow,
  normalizeCostRow,
  type ReportFilters,
} from '@/lib/api/reports'

const mockedApiFetch = vi.mocked(apiFetch)

function lastCall() {
  return mockedApiFetch.mock.calls[mockedApiFetch.mock.calls.length - 1]
}

/**
 * A full backend /reports/summary payload: NUMERIC/COUNT aggregates as pg
 * strings, nullable %-change fields as real numeric strings by default.
 */
function summaryRow(overrides: Record<string, unknown> = {}) {
  return {
    period: 'monthly',
    periodStart: '2026-07-01T00:00:00.000Z',
    periodEnd: '2026-08-01T00:00:00.000Z',
    prevPeriodStart: '2026-06-01T00:00:00.000Z',
    prevPeriodEnd: '2026-07-01T00:00:00.000Z',
    branchId: null,

    totalRevenue: '125000.50',
    previousRevenue: '100000.00',
    revenueChange: '25',

    totalCosts: '40000.00',
    previousCosts: '50000.00',
    costsChange: '-20',

    grossProfit: '85000.50',
    grossProfitMargin: '68',

    totalOrders: '320',
    ordersChange: '12.5',
    itemsProcessed: '8400',
    itemsProcessedChange: '7.1',
    completedOrders: '290',
    pendingOrders: '30',
    activeJobOrders: '18',
    completionRate: '90.6',
    onTimeDeliveryRate: '95.2',
    averageProcessingTime: '12.4',
    averageProcessingTimeChange: '-3.2',
    averageOrderValue: '390.63',

    totalCustomers: '210',
    activeCustomers: '75',
    newCustomers: '12',
    returningCustomers: '63',
    customerRetentionRate: '84',

    inventoryValue: '52000.00',
    lowStockItems: '4',
    outOfStockItems: '1',
    totalInventoryItems: '46',
    ...overrides,
  }
}

function salesRow(overrides: Record<string, unknown> = {}) {
  return {
    serviceType: 'wash_fold',
    orderCount: '120',
    revenue: '48000.00',
    percentage: '38.4',
    ...overrides,
  }
}

function costRow(overrides: Record<string, unknown> = {}) {
  return {
    category: 'utilities',
    amount: '15000.00',
    count: '8',
    percentage: '37.5',
    ...overrides,
  }
}

beforeEach(() => {
  mockedApiFetch.mockReset()
})

// ---------------------------------------------------------------------------
// 1. buildReportsQuery — pure seam (spec §(f))
// ---------------------------------------------------------------------------
describe('buildReportsQuery — pure querystring builder', () => {
  it('emits just ?period=monthly for a plain period', () => {
    expect(buildReportsQuery({ period: 'monthly' })).toBe('?period=monthly')
  })

  it('emits ?period=weekly&branchId=b1 when a branch filter is set', () => {
    expect(buildReportsQuery({ period: 'weekly', branchId: 'b1' })).toBe(
      '?period=weekly&branchId=b1'
    )
  })

  it('emits period + start + end for a custom range', () => {
    expect(
      buildReportsQuery({ period: 'custom', start: '2026-01-01', end: '2026-01-31' })
    ).toBe('?period=custom&start=2026-01-01&end=2026-01-31')
  })

  it('emits all four params together (custom + branch)', () => {
    expect(
      buildReportsQuery({
        period: 'custom',
        start: '2026-01-01',
        end: '2026-01-31',
        branchId: 'b1',
      })
    ).toBe('?period=custom&start=2026-01-01&end=2026-01-31&branchId=b1')
  })

  it('URL-encodes a branchId containing a space', () => {
    expect(buildReportsQuery({ period: 'monthly', branchId: 'BKK 01' })).toBe(
      '?period=monthly&branchId=BKK+01'
    )
  })

  it('omits start/end when not provided (non-custom period)', () => {
    const q = buildReportsQuery({ period: 'daily' })
    expect(q).toBe('?period=daily')
    expect(q).not.toContain('start')
    expect(q).not.toContain('end')
  })

  it('returns "" (no leading ?) when period is empty/falsy', () => {
    expect(buildReportsQuery({ period: '' as ReportFilters['period'] })).toBe('')
  })
})

// ---------------------------------------------------------------------------
// 2. normalize — pure seam (spec §(f)): strings → numbers, null %-change stays null
// ---------------------------------------------------------------------------
describe('normalize — pg summary row → ReportSummary', () => {
  it('coerces every aggregate NUMERIC/COUNT string to a real number', () => {
    const s = normalize(summaryRow())
    expect(s.totalRevenue).toBe(125000.5)
    expect(typeof s.totalRevenue).toBe('number')
    expect(s.totalOrders).toBe(320)
    expect(s.itemsProcessed).toBe(8400)
    expect(s.grossProfit).toBe(85000.5)
    expect(s.averageOrderValue).toBe(390.63)
    expect(s.inventoryValue).toBe(52000)
    expect(s.totalInventoryItems).toBe(46)
  })

  it('coerces the nullable %-change fields to numbers when present', () => {
    const s = normalize(summaryRow())
    expect(s.revenueChange).toBe(25)
    expect(s.costsChange).toBe(-20)
    expect(s.ordersChange).toBe(12.5)
    expect(s.itemsProcessedChange).toBe(7.1)
    expect(s.averageProcessingTimeChange).toBe(-3.2)
  })

  it('PRESERVES a null %-change as null (does NOT coerce to 0)', () => {
    const s = normalize(
      summaryRow({
        revenueChange: null,
        costsChange: null,
        ordersChange: null,
        itemsProcessedChange: null,
        averageProcessingTimeChange: null,
      })
    )
    expect(s.revenueChange).toBeNull()
    expect(s.costsChange).toBeNull()
    expect(s.ordersChange).toBeNull()
    expect(s.itemsProcessedChange).toBeNull()
    expect(s.averageProcessingTimeChange).toBeNull()
  })

  it('distinguishes a real "0" %-change from null (0 stays 0)', () => {
    const s = normalize(summaryRow({ revenueChange: '0' }))
    expect(s.revenueChange).toBe(0)
    expect(typeof s.revenueChange).toBe('number')
  })

  it('defaults a MISSING numeric aggregate to 0', () => {
    const row = summaryRow()
    delete (row as Record<string, unknown>).totalRevenue
    expect(normalize(row).totalRevenue).toBe(0)
  })

  it('defaults a MISSING nullable %-change to null (numOrNull semantics)', () => {
    const row = summaryRow()
    delete (row as Record<string, unknown>).revenueChange
    expect(normalize(row).revenueChange).toBeNull()
  })

  it('maps an absent branchId to null and passes a present one through', () => {
    expect(normalize(summaryRow()).branchId).toBeNull()
    expect(normalize(summaryRow({ branchId: 'BKK01' })).branchId).toBe('BKK01')
  })

  it('passes period + range echo fields through unchanged', () => {
    const s = normalize(summaryRow())
    expect(s.period).toBe('monthly')
    expect(s.periodStart).toBe('2026-07-01T00:00:00.000Z')
    expect(s.periodEnd).toBe('2026-08-01T00:00:00.000Z')
    expect(s.prevPeriodStart).toBe('2026-06-01T00:00:00.000Z')
    expect(s.prevPeriodEnd).toBe('2026-07-01T00:00:00.000Z')
  })
})

// ---------------------------------------------------------------------------
// 3. normalizeSalesRow / normalizeCostRow — pure seams (spec §(f))
// ---------------------------------------------------------------------------
describe('normalizeSalesRow — pg sales row → SalesByServiceRow', () => {
  it('coerces orderCount/revenue/percentage strings to numbers', () => {
    const r = normalizeSalesRow(salesRow())
    expect(r.orderCount).toBe(120)
    expect(typeof r.orderCount).toBe('number')
    expect(r.revenue).toBe(48000)
    expect(r.percentage).toBe(38.4)
  })

  it('passes serviceType through unchanged', () => {
    expect(normalizeSalesRow(salesRow({ serviceType: 'dry_clean' })).serviceType).toBe(
      'dry_clean'
    )
  })
})

describe('normalizeCostRow — pg cost row → CostByCategoryRow', () => {
  it('coerces amount/count/percentage strings to numbers', () => {
    const r = normalizeCostRow(costRow())
    expect(r.amount).toBe(15000)
    expect(typeof r.amount).toBe('number')
    expect(r.count).toBe(8)
    expect(r.percentage).toBe(37.5)
  })

  it('passes category through unchanged', () => {
    expect(normalizeCostRow(costRow({ category: 'supplies' })).category).toBe('supplies')
  })
})

// ---------------------------------------------------------------------------
// 4. fetchSummary — request shape + normalized single object (spec §(c))
// ---------------------------------------------------------------------------
describe('fetchSummary — request shape', () => {
  it('GETs /reports/summary with the built querystring (no envelope)', async () => {
    mockedApiFetch.mockResolvedValue(summaryRow())
    await fetchSummary({ period: 'monthly' })
    expect(lastCall()[0]).toBe('/reports/summary?period=monthly')
  })

  it('carries custom start/end + branchId into the path', async () => {
    mockedApiFetch.mockResolvedValue(summaryRow())
    await fetchSummary({
      period: 'custom',
      start: '2026-01-01',
      end: '2026-01-31',
      branchId: 'b1',
    })
    expect(lastCall()[0]).toBe(
      '/reports/summary?period=custom&start=2026-01-01&end=2026-01-31&branchId=b1'
    )
  })

  it('returns the NORMALIZED summary (pg strings → numbers, null change kept null)', async () => {
    mockedApiFetch.mockResolvedValue(summaryRow({ revenueChange: null }))
    const s = await fetchSummary({ period: 'monthly' })
    expect(s.totalRevenue).toBe(125000.5)
    expect(typeof s.totalRevenue).toBe('number')
    expect(s.revenueChange).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 5. fetchSalesByService — { salesByService } envelope (spec §(c))
// ---------------------------------------------------------------------------
describe('fetchSalesByService — request shape + envelope', () => {
  it('GETs /reports/sales-by-service with the built querystring', async () => {
    mockedApiFetch.mockResolvedValue({ salesByService: [] })
    await fetchSalesByService({ period: 'weekly', branchId: 'b1' })
    expect(lastCall()[0]).toBe('/reports/sales-by-service?period=weekly&branchId=b1')
  })

  it('maps { salesByService: [...] } to a normalized array', async () => {
    mockedApiFetch.mockResolvedValue({
      salesByService: [salesRow(), salesRow({ serviceType: 'express', revenue: '9000.00' })],
    })
    const out = await fetchSalesByService({ period: 'monthly' })
    expect(Array.isArray(out)).toBe(true)
    expect(out).toHaveLength(2)
    expect(out[0].revenue).toBe(48000) // normalized
    expect(typeof out[0].orderCount).toBe('number')
  })

  it('returns [] when the envelope list is missing/undefined', async () => {
    mockedApiFetch.mockResolvedValue({})
    expect(await fetchSalesByService({ period: 'monthly' })).toEqual([])
    mockedApiFetch.mockResolvedValue({ salesByService: undefined })
    expect(await fetchSalesByService({ period: 'monthly' })).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 6. fetchCostByCategory — { costByCategory } envelope (spec §(c))
// ---------------------------------------------------------------------------
describe('fetchCostByCategory — request shape + envelope', () => {
  it('GETs /reports/cost-by-category with the built querystring', async () => {
    mockedApiFetch.mockResolvedValue({ costByCategory: [] })
    await fetchCostByCategory({ period: 'quarterly' })
    expect(lastCall()[0]).toBe('/reports/cost-by-category?period=quarterly')
  })

  it('maps { costByCategory: [...] } to a normalized array', async () => {
    mockedApiFetch.mockResolvedValue({
      costByCategory: [costRow(), costRow({ category: 'salary', amount: '25000.00' })],
    })
    const out = await fetchCostByCategory({ period: 'monthly' })
    expect(out).toHaveLength(2)
    expect(out[0].amount).toBe(15000) // normalized
    expect(typeof out[0].count).toBe('number')
  })

  it('returns [] when the envelope list is missing/undefined', async () => {
    mockedApiFetch.mockResolvedValue({})
    expect(await fetchCostByCategory({ period: 'monthly' })).toEqual([])
    mockedApiFetch.mockResolvedValue({ costByCategory: undefined })
    expect(await fetchCostByCategory({ period: 'monthly' })).toEqual([])
  })
})
