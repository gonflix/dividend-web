import { describe, it, expect } from 'vitest'
import {
  dividendTax,
  pensionWithdrawalRate,
  pensionWithdrawalTax,
  ISA_TAX_FREE_LIMIT_GENERAL,
  ISA_TAX_FREE_LIMIT_PREFERENCE,
  ISA_OVER_LIMIT_RATE,
  US_WITHHOLDING_RATE,
  GENERAL_KR_RATE,
  PENSION_WITHDRAWAL_RATES,
} from '../src/domain/tax.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('exported constants', () => {
  it('ISA_TAX_FREE_LIMIT_GENERAL = 2,000,000 KRW', () => {
    expect(ISA_TAX_FREE_LIMIT_GENERAL).toBe(2_000_000)
  })
  it('ISA_TAX_FREE_LIMIT_PREFERENCE = 4,000,000 KRW', () => {
    expect(ISA_TAX_FREE_LIMIT_PREFERENCE).toBe(4_000_000)
  })
  it('ISA_OVER_LIMIT_RATE = 0.099 (9.9%)', () => {
    expect(ISA_OVER_LIMIT_RATE).toBeCloseTo(0.099)
  })
  it('US_WITHHOLDING_RATE = 0.15 (15%)', () => {
    expect(US_WITHHOLDING_RATE).toBeCloseTo(0.15)
  })
  it('GENERAL_KR_RATE = 0.154 (15.4%)', () => {
    expect(GENERAL_KR_RATE).toBeCloseTo(0.154)
  })
  it('PENSION withdrawal rates: 5.5% / 4.4% / 3.3%', () => {
    expect(PENSION_WITHDRAWAL_RATES.under70).toBeCloseTo(0.055)
    expect(PENSION_WITHDRAWAL_RATES.age70to79).toBeCloseTo(0.044)
    expect(PENSION_WITHDRAWAL_RATES.age80plus).toBeCloseTo(0.033)
  })
})

// ---------------------------------------------------------------------------
// GENERAL account
// ---------------------------------------------------------------------------

describe('GENERAL account', () => {
  it('KR dividend: 15.4% withheld', () => {
    const tax = dividendTax({ gross: 1_000_000, market: 'KR', accountType: 'GENERAL' })
    expect(tax).toBeCloseTo(154_000)
  })

  it('US dividend: 15% withheld (KR-US treaty)', () => {
    const tax = dividendTax({ gross: 1_000_000, market: 'US', accountType: 'GENERAL' })
    expect(tax).toBeCloseTo(150_000)
  })

  it('gross = 0 → tax = 0', () => {
    expect(dividendTax({ gross: 0, market: 'KR', accountType: 'GENERAL' })).toBe(0)
  })

  it('gross < 0 → tax = 0', () => {
    expect(dividendTax({ gross: -100, market: 'KR', accountType: 'GENERAL' })).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// ISA account — KR dividends
// ---------------------------------------------------------------------------

describe('ISA account — KR dividends', () => {
  it('below threshold (일반형): tax = 0', () => {
    const tax = dividendTax({
      gross: 500_000,
      market: 'KR',
      accountType: 'ISA',
      isaProfitToDate: 0,
    })
    expect(tax).toBe(0)
  })

  it('exactly at threshold: tax = 0', () => {
    const tax = dividendTax({
      gross: 2_000_000,
      market: 'KR',
      accountType: 'ISA',
      isaProfitToDate: 0,
    })
    expect(tax).toBe(0)
  })

  it('above threshold (일반형): 9.9% on over-threshold portion only', () => {
    // profitToDate = 1,500,000; gross = 1,000,000 → 500,000 over limit
    const tax = dividendTax({
      gross: 1_000_000,
      market: 'KR',
      accountType: 'ISA',
      isaProfitToDate: 1_500_000,
    })
    expect(tax).toBeCloseTo(500_000 * 0.099)  // 49,500
  })

  it('entirely above threshold (일반형): 9.9% on full gross', () => {
    const tax = dividendTax({
      gross: 300_000,
      market: 'KR',
      accountType: 'ISA',
      isaProfitToDate: 2_000_000,
    })
    expect(tax).toBeCloseTo(300_000 * 0.099)  // 29,700
  })

  it('서민형 (PREFERENCE_TYPE) threshold = 4,000,000', () => {
    // 3,500,000 already accumulated; gross 300,000 → still below 4M limit
    const tax = dividendTax({
      gross: 300_000,
      market: 'KR',
      accountType: 'ISA',
      isaType: 'PREFERENCE_TYPE',
      isaProfitToDate: 3_500_000,
    })
    expect(tax).toBe(0)
  })

  it('서민형 over threshold: 9.9% on over-threshold portion', () => {
    // profitToDate = 3,800,000; gross = 400,000 → 200,000 over 4M limit
    const tax = dividendTax({
      gross: 400_000,
      market: 'KR',
      accountType: 'ISA',
      isaType: 'PREFERENCE_TYPE',
      isaProfitToDate: 3_800_000,
    })
    expect(tax).toBeCloseTo(200_000 * 0.099)
  })
})

// ---------------------------------------------------------------------------
// ISA account — US dividends (AC-S7)
// ---------------------------------------------------------------------------

describe('ISA account — US dividends', () => {
  it('US dividend always incurs 15% withholding (ISA cannot shelter US tax)', () => {
    const tax = dividendTax({
      gross: 1_000_000,
      market: 'US',
      accountType: 'ISA',
      isaProfitToDate: 0,
    })
    expect(tax).toBeCloseTo(150_000)
  })

  it('US dividend above ISA threshold still only 15% (no additional Korean 9.9%)', () => {
    const tax = dividendTax({
      gross: 1_000_000,
      market: 'US',
      accountType: 'ISA',
      isaProfitToDate: 5_000_000,  // well above limit
    })
    expect(tax).toBeCloseTo(150_000)
  })

  it('ISA × US: effective after-tax = gross * 0.85', () => {
    const gross = 800_000
    const tax = dividendTax({ gross, market: 'US', accountType: 'ISA' })
    expect(gross - tax).toBeCloseTo(gross * 0.85)
  })
})

// ---------------------------------------------------------------------------
// ISA threshold: US dividends count toward isaProfitToDate (AC-S7 cross-type)
// ---------------------------------------------------------------------------

describe('ISA threshold accumulation across KR + US dividends', () => {
  it('KR dividend after US profit pushed over threshold → 9.9% on over portion', () => {
    // US profits of 1,800,000 already counted toward limit
    // Now a KR dividend of 500,000 → 300,000 is over the 2M limit
    const tax = dividendTax({
      gross: 500_000,
      market: 'KR',
      accountType: 'ISA',
      isaProfitToDate: 1_800_000,  // US profits counted previously
    })
    expect(tax).toBeCloseTo(300_000 * 0.099)
  })
})

// ---------------------------------------------------------------------------
// PENSION account — accumulation phase (AC-S3, AC-S8)
// ---------------------------------------------------------------------------

describe('PENSION account — accumulation phase', () => {
  it('KR dividend during accumulation: tax = 0 (fully deferred)', () => {
    const tax = dividendTax({ gross: 1_000_000, market: 'KR', accountType: 'PENSION' })
    expect(tax).toBe(0)
  })

  it('US dividend during accumulation: 15% US withholding (cannot defer)', () => {
    const tax = dividendTax({ gross: 1_000_000, market: 'US', accountType: 'PENSION' })
    expect(tax).toBeCloseTo(150_000)
  })

  it('PENSION-US: accumulated value = gross * 0.85', () => {
    const gross = 500_000
    const tax = dividendTax({ gross, market: 'US', accountType: 'PENSION' })
    expect(gross - tax).toBeCloseTo(gross * 0.85)
  })
})

// ---------------------------------------------------------------------------
// PENSION withdrawal tax (age-tiered 연금소득세)
// ---------------------------------------------------------------------------

describe('pensionWithdrawalRate', () => {
  it('age 55 → 5.5%', () => {
    expect(pensionWithdrawalRate(55)).toBeCloseTo(0.055)
  })

  it('age 69 → 5.5%', () => {
    expect(pensionWithdrawalRate(69)).toBeCloseTo(0.055)
  })

  it('age 70 → 4.4%', () => {
    expect(pensionWithdrawalRate(70)).toBeCloseTo(0.044)
  })

  it('age 75 → 4.4%', () => {
    expect(pensionWithdrawalRate(75)).toBeCloseTo(0.044)
  })

  it('age 79 → 4.4%', () => {
    expect(pensionWithdrawalRate(79)).toBeCloseTo(0.044)
  })

  it('age 80 → 3.3%', () => {
    expect(pensionWithdrawalRate(80)).toBeCloseTo(0.033)
  })

  it('age 82 → 3.3%', () => {
    expect(pensionWithdrawalRate(82)).toBeCloseTo(0.033)
  })
})

describe('pensionWithdrawalTax', () => {
  it('age 55: accumulated 10,000,000 → tax = 550,000 (5.5%)', () => {
    expect(pensionWithdrawalTax(10_000_000, 55)).toBeCloseTo(550_000)
  })

  it('age 75: accumulated 10,000,000 → tax = 440,000 (4.4%)', () => {
    expect(pensionWithdrawalTax(10_000_000, 75)).toBeCloseTo(440_000)
  })

  it('age 80: accumulated 10,000,000 → tax = 330,000 (3.3%)', () => {
    expect(pensionWithdrawalTax(10_000_000, 80)).toBeCloseTo(330_000)
  })

  it('withdrawal tax < accumulation (after-tax > 0)', () => {
    const accumulated = 5_000_000
    const tax = pensionWithdrawalTax(accumulated, 55)
    expect(accumulated - tax).toBeGreaterThan(0)
  })
})
