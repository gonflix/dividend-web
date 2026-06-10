import { describe, it, expect, beforeEach } from 'vitest'
import {
  addHolding,
  getHoldings,
  updateHolding,
  deleteHolding,
  STORAGE_KEY,
  SCHEMA_VERSION,
  ValidationError,
} from '../src/store/holdingsStore.js'

// jsdom provides localStorage; clear between tests for isolation
beforeEach(() => {
  localStorage.clear()
})

// ---------------------------------------------------------------------------
// addHolding + getHoldings roundtrip
// ---------------------------------------------------------------------------

describe('addHolding + getHoldings roundtrip', () => {
  it('stores a position and retrieves it', () => {
    const added = addHolding({
      ticker: 'aapl',
      market: 'US',
      quantity: 10,
      costBasis: 200_000,
      accountType: 'ISA',
    })
    const all = getHoldings()
    expect(all).toHaveLength(1)
    expect(all[0]).toMatchObject({
      ticker: 'AAPL',   // uppercased
      market: 'US',
      quantity: 10,
      costBasis: 200_000,
      accountType: 'ISA',
      schemaVersion: SCHEMA_VERSION,
    })
    expect(all[0].id).toBe(added.id)
  })

  it('ticker is uppercased on store', () => {
    addHolding({ ticker: '005930', market: 'KR', quantity: 5, costBasis: 70_000, accountType: 'GENERAL' })
    expect(getHoldings()[0].ticker).toBe('005930')
  })

  it('multiple positions accumulate', () => {
    addHolding({ ticker: 'A', market: 'US', quantity: 1, costBasis: 100, accountType: 'GENERAL' })
    addHolding({ ticker: 'B', market: 'KR', quantity: 2, costBasis: 200, accountType: 'ISA' })
    expect(getHoldings()).toHaveLength(2)
  })

  it('each position gets a unique id', () => {
    addHolding({ ticker: 'A', market: 'US', quantity: 1, costBasis: 100, accountType: 'GENERAL' })
    addHolding({ ticker: 'B', market: 'US', quantity: 1, costBasis: 100, accountType: 'GENERAL' })
    const ids = getHoldings().map((p) => p.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('schemaVersion is set to SCHEMA_VERSION', () => {
    addHolding({ ticker: 'X', market: 'US', quantity: 1, costBasis: 50, accountType: 'PENSION' })
    expect(getHoldings()[0].schemaVersion).toBe(SCHEMA_VERSION)
  })
})

// ---------------------------------------------------------------------------
// Persistence simulation (simulated page reload)
// ---------------------------------------------------------------------------

describe('persistence across simulated reload', () => {
  it('data survives localStorage-restore roundtrip (simulated reload)', () => {
    addHolding({ ticker: 'VOO', market: 'US', quantity: 5, costBasis: 550_000, accountType: 'ISA' })

    // Simulate page reload: snapshot and restore localStorage
    const snapshot = localStorage.getItem(STORAGE_KEY)!
    localStorage.clear()
    localStorage.setItem(STORAGE_KEY, snapshot)

    const recovered = getHoldings()
    expect(recovered).toHaveLength(1)
    expect(recovered[0].ticker).toBe('VOO')
    expect(recovered[0].accountType).toBe('ISA')
  })

  it('getHoldings returns [] when storage is empty', () => {
    expect(getHoldings()).toHaveLength(0)
  })

  it('getHoldings returns [] on corrupt JSON in storage', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json{{{')
    expect(getHoldings()).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// updateHolding
// ---------------------------------------------------------------------------

describe('updateHolding', () => {
  it('updates quantity', () => {
    const p = addHolding({ ticker: 'T', market: 'KR', quantity: 3, costBasis: 1000, accountType: 'GENERAL' })
    updateHolding(p.id, { quantity: 10 })
    expect(getHoldings()[0].quantity).toBe(10)
  })

  it('updates costBasis', () => {
    const p = addHolding({ ticker: 'T', market: 'KR', quantity: 3, costBasis: 1000, accountType: 'GENERAL' })
    updateHolding(p.id, { costBasis: 99_000 })
    expect(getHoldings()[0].costBasis).toBe(99_000)
  })

  it('preserves other fields when updating one', () => {
    const p = addHolding({ ticker: 'T', market: 'US', quantity: 3, costBasis: 1000, accountType: 'ISA' })
    updateHolding(p.id, { quantity: 7 })
    const updated = getHoldings()[0]
    expect(updated.ticker).toBe('T')
    expect(updated.market).toBe('US')
    expect(updated.accountType).toBe('ISA')
  })

  it('throws when id not found', () => {
    expect(() => updateHolding('non-existent-id', { quantity: 5 })).toThrow()
  })

  it('validates accountType on update', () => {
    const p = addHolding({ ticker: 'T', market: 'KR', quantity: 1, costBasis: 100, accountType: 'GENERAL' })
    expect(() => updateHolding(p.id, { accountType: 'INVALID' as never })).toThrow(ValidationError)
  })
})

// ---------------------------------------------------------------------------
// deleteHolding
// ---------------------------------------------------------------------------

describe('deleteHolding', () => {
  it('removes the position by id', () => {
    const a = addHolding({ ticker: 'A', market: 'KR', quantity: 1, costBasis: 100, accountType: 'GENERAL' })
    addHolding({ ticker: 'B', market: 'KR', quantity: 1, costBasis: 100, accountType: 'GENERAL' })
    deleteHolding(a.id)
    const remaining = getHoldings()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].ticker).toBe('B')
  })

  it('no-op when id does not exist', () => {
    addHolding({ ticker: 'A', market: 'KR', quantity: 1, costBasis: 100, accountType: 'GENERAL' })
    deleteHolding('non-existent')
    expect(getHoldings()).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// accountType validation (AC: rejects invalid values)
// ---------------------------------------------------------------------------

describe('accountType validation', () => {
  it('rejects accountType not in ISA/PENSION/GENERAL', () => {
    expect(() =>
      addHolding({ ticker: 'X', market: 'KR', quantity: 1, costBasis: 100, accountType: 'BROKERAGE' as never })
    ).toThrow(ValidationError)
  })

  it('accepts ISA', () => {
    expect(() =>
      addHolding({ ticker: 'X', market: 'KR', quantity: 1, costBasis: 100, accountType: 'ISA' })
    ).not.toThrow()
  })

  it('accepts PENSION', () => {
    expect(() =>
      addHolding({ ticker: 'X', market: 'KR', quantity: 1, costBasis: 100, accountType: 'PENSION' })
    ).not.toThrow()
  })

  it('accepts GENERAL', () => {
    expect(() =>
      addHolding({ ticker: 'X', market: 'KR', quantity: 1, costBasis: 100, accountType: 'GENERAL' })
    ).not.toThrow()
  })
})
