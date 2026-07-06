/**
 * Unit tests for the PURE stock arithmetic in models/inventoryItem.ts.
 *
 * These are the highest-value correctness surface of the Consumable Stock
 * module: they run with NO database (the functions are pure), and mirror the
 * Architect's I/O tables in the integration spec (§8.1 applyStockMovement,
 * §8.2 computeTotalCost). The Architect already implemented these functions, so
 * this suite should pass immediately.
 */
import { describe, it, expect } from 'vitest'
import {
  applyStockMovement,
  computeTotalCost,
  StockMovementError,
  type StockTransactionType,
} from './inventoryItem'

/** Assert the call throws a StockMovementError carrying the expected .code. */
function expectCode(
  type: StockTransactionType,
  quantity: number,
  currentStock: number,
  code: string
) {
  try {
    applyStockMovement(type, quantity, currentStock)
    throw new Error(`expected StockMovementError(${code}) but no error was thrown`)
  } catch (err) {
    expect(err).toBeInstanceOf(StockMovementError)
    expect((err as StockMovementError).code).toBe(code)
  }
}

// ---------------------------------------------------------------------------
// applyStockMovement — spec §8.1 I/O table
// ---------------------------------------------------------------------------
describe('applyStockMovement — additive types (stock_in / return)', () => {
  it('stock_in 30 on 50 → 80', () => {
    expect(applyStockMovement('stock_in', 30, 50)).toBe(80)
  })

  it('return 10 on 50 → 60', () => {
    expect(applyStockMovement('return', 10, 50)).toBe(60)
  })

  it('stock_in 0 → INVALID_QUANTITY', () => {
    expectCode('stock_in', 0, 50, 'INVALID_QUANTITY')
  })

  it('stock_in negative → INVALID_QUANTITY', () => {
    expectCode('stock_in', -5, 50, 'INVALID_QUANTITY')
  })

  it('return 0 → INVALID_QUANTITY', () => {
    expectCode('return', 0, 50, 'INVALID_QUANTITY')
  })

  it('rounds an added fractional quantity to 2dp (0.1 on 50.05 → 50.15)', () => {
    expect(applyStockMovement('stock_in', 0.1, 50.05)).toBe(50.15)
  })
})

describe('applyStockMovement — stock_out', () => {
  it('stock_out 20 on 50 → 30', () => {
    expect(applyStockMovement('stock_out', 20, 50)).toBe(30)
  })

  it('stock_out 50 on 50 → 0 (boundary OK)', () => {
    expect(applyStockMovement('stock_out', 50, 50)).toBe(0)
  })

  it('stock_out 60 on 50 → STOCK_NEGATIVE', () => {
    expectCode('stock_out', 60, 50, 'STOCK_NEGATIVE')
  })

  it('stock_out 0 → INVALID_QUANTITY', () => {
    expectCode('stock_out', 0, 50, 'INVALID_QUANTITY')
  })

  it('stock_out negative → INVALID_QUANTITY', () => {
    expectCode('stock_out', -5, 50, 'INVALID_QUANTITY')
  })
})

describe('applyStockMovement — adjustment (signed delta)', () => {
  it('adjustment -15 on 50 → 35', () => {
    expect(applyStockMovement('adjustment', -15, 50)).toBe(35)
  })

  it('adjustment +15 on 50 → 65', () => {
    expect(applyStockMovement('adjustment', 15, 50)).toBe(65)
  })

  it('adjustment -50 on 50 → 0 (boundary OK)', () => {
    expect(applyStockMovement('adjustment', -50, 50)).toBe(0)
  })

  it('adjustment -51 on 50 → STOCK_NEGATIVE', () => {
    expectCode('adjustment', -51, 50, 'STOCK_NEGATIVE')
  })

  it('adjustment 0 → INVALID_QUANTITY', () => {
    expectCode('adjustment', 0, 50, 'INVALID_QUANTITY')
  })
})

describe('applyStockMovement — transfer / invalid', () => {
  it('transfer → TRANSFER_NOT_SUPPORTED', () => {
    expectCode('transfer', 10, 50, 'TRANSFER_NOT_SUPPORTED')
  })

  it('non-finite quantity → INVALID_QUANTITY', () => {
    expectCode('stock_in', NaN, 50, 'INVALID_QUANTITY')
  })

  it('unknown type → INVALID_TYPE', () => {
    expectCode('bogus' as StockTransactionType, 10, 50, 'INVALID_TYPE')
  })
})

// ---------------------------------------------------------------------------
// computeTotalCost — spec §8.2 I/O table
// ---------------------------------------------------------------------------
describe('computeTotalCost — round(|unitCost| * |quantity|, 2)', () => {
  it('85.5 * 20 → 1710', () => {
    expect(computeTotalCost(85.5, 20)).toBe(1710)
  })

  it('85.555 * 2 → 171.11 (round half-up to 2dp)', () => {
    expect(computeTotalCost(85.555, 2)).toBe(171.11)
  })

  it('uses absolute values for a negative adjustment quantity (10 * -3 → 30)', () => {
    expect(computeTotalCost(10, -3)).toBe(30)
  })

  it('0 * 5 → 0', () => {
    expect(computeTotalCost(0, 5)).toBe(0)
  })
})
