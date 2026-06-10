import { describe, it, expect } from 'vitest'
import { project } from '../src/domain/projection.js'
import type { ProjectInput } from '../src/domain/projection.js'

const base: ProjectInput = {
  monthlyDca: 500_000,
  years: 5,
  model: 'base',
  annualDividendYield: 0.04,
  market: 'KR',
  accountType: 'GENERAL',
}

// ---------------------------------------------------------------------------
// series shape
// ---------------------------------------------------------------------------

describe('series shape', () => {
  it('series.length === years * 12', () => {
    const { series } = project(base)
    expect(series).toHaveLength(base.years * 12)
  })

  it('all series values are non-negative', () => {
    const { series } = project(base)
    series.forEach((v) => expect(v).toBeGreaterThanOrEqual(0))
  })

  it('series grows monotonically with DCA (same yield, no growth model)', () => {
    const { series } = project({ ...base, model: 'pessimistic', years: 3 })
    for (let i = 1; i < series.length; i++) {
      expect(series[i]).toBeGreaterThanOrEqual(series[i - 1])
    }
  })
})

// ---------------------------------------------------------------------------
// headline ordering invariant
// ---------------------------------------------------------------------------

describe('headline ordering: optimistic >= base >= pessimistic', () => {
  it('KR GENERAL', () => {
    const opt = project({ ...base, model: 'optimistic' }).headlineTotal
    const mid = project({ ...base, model: 'base' }).headlineTotal
    const pess = project({ ...base, model: 'pessimistic' }).headlineTotal
    expect(opt).toBeGreaterThanOrEqual(mid)
    expect(mid).toBeGreaterThanOrEqual(pess)
  })

  it('US ISA', () => {
    const input: ProjectInput = { ...base, market: 'US', accountType: 'ISA' }
    const opt = project({ ...input, model: 'optimistic' }).headlineTotal
    const mid = project({ ...input, model: 'base' }).headlineTotal
    const pess = project({ ...input, model: 'pessimistic' }).headlineTotal
    expect(opt).toBeGreaterThanOrEqual(mid)
    expect(mid).toBeGreaterThanOrEqual(pess)
  })

  it('KR PENSION (age 55)', () => {
    const input: ProjectInput = { ...base, accountType: 'PENSION', ageAtWithdrawal: 55 }
    const opt = project({ ...input, model: 'optimistic' }).headlineTotal
    const mid = project({ ...input, model: 'base' }).headlineTotal
    const pess = project({ ...input, model: 'pessimistic' }).headlineTotal
    expect(opt).toBeGreaterThanOrEqual(mid)
    expect(mid).toBeGreaterThanOrEqual(pess)
  })
})

// ---------------------------------------------------------------------------
// preTaxTotal > headlineTotal (taxes are actually applied)
// ---------------------------------------------------------------------------

describe('tax is applied (preTaxTotal > headlineTotal)', () => {
  it('GENERAL KR: taxes reduce headline', () => {
    const { preTaxTotal, headlineTotal } = project(base)
    expect(preTaxTotal).toBeGreaterThan(headlineTotal)
  })

  it('GENERAL US: taxes reduce headline', () => {
    const { preTaxTotal, headlineTotal } = project({ ...base, market: 'US' })
    expect(preTaxTotal).toBeGreaterThan(headlineTotal)
  })

  it('PENSION KR: withdrawal tax reduces headline below per-div accumulated', () => {
    const result = project({ ...base, accountType: 'PENSION', ageAtWithdrawal: 55 })
    // sum of series (accumulated without per-div tax) > headlineTotal (after withdrawal tax)
    const sumSeries = result.series.reduce((a, b) => a + b, 0)
    expect(sumSeries).toBeGreaterThan(result.headlineTotal)
  })
})

// ---------------------------------------------------------------------------
// ISA 비과세 benefit vs GENERAL
// ---------------------------------------------------------------------------

describe('ISA provides 비과세 benefit over GENERAL for KR dividends', () => {
  it('ISA KR headline >= GENERAL KR headline', () => {
    const isa = project({ ...base, accountType: 'ISA', years: 2 }).headlineTotal
    const general = project({ ...base, accountType: 'GENERAL', years: 2 }).headlineTotal
    expect(isa).toBeGreaterThanOrEqual(general)
  })
})

// ---------------------------------------------------------------------------
// PENSION withdrawal tax applies age tiers
// ---------------------------------------------------------------------------

describe('PENSION age tier affects headline', () => {
  it('older age → lower withdrawal rate → higher headline', () => {
    const age55 = project({ ...base, accountType: 'PENSION', ageAtWithdrawal: 55 }).headlineTotal
    const age75 = project({ ...base, accountType: 'PENSION', ageAtWithdrawal: 75 }).headlineTotal
    const age82 = project({ ...base, accountType: 'PENSION', ageAtWithdrawal: 82 }).headlineTotal
    expect(age82).toBeGreaterThanOrEqual(age75)
    expect(age75).toBeGreaterThanOrEqual(age55)
  })
})

// ---------------------------------------------------------------------------
// ISA threshold effect: profits above 2M trigger 9.9%
// ---------------------------------------------------------------------------

describe('ISA threshold: profits above limit attract 9.9%', () => {
  it('high-yield ISA over many years: headline < pre-tax total', () => {
    const { preTaxTotal, headlineTotal } = project({
      ...base,
      accountType: 'ISA',
      annualDividendYield: 0.10,  // high yield to cross threshold quickly
      years: 3,
    })
    // Given high yield and 3 years of DCA, ISA profit threshold will be crossed
    expect(preTaxTotal).toBeGreaterThan(headlineTotal)
  })
})

// ---------------------------------------------------------------------------
// Zero yield → zero dividends
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('annualDividendYield = 0 → headlineTotal = 0', () => {
    const { headlineTotal, series } = project({ ...base, annualDividendYield: 0 })
    expect(headlineTotal).toBe(0)
    series.forEach((v) => expect(v).toBe(0))
  })

  it('years = 1 → series.length = 12', () => {
    expect(project({ ...base, years: 1 }).series).toHaveLength(12)
  })
})
