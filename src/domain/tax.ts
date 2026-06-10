import type { Market, AccountType, IsaType } from './types.js'

// ---------------------------------------------------------------------------
// Korean dividend tax constants
// ---------------------------------------------------------------------------

/** ISA 비과세 profit threshold — 일반형 (general type). Unit: KRW, on profits (배당+이자). */
export const ISA_TAX_FREE_LIMIT_GENERAL = 2_000_000

/** ISA 비과세 profit threshold — 서민형/농어민형 (preference type). Unit: KRW, on profits. */
export const ISA_TAX_FREE_LIMIT_PREFERENCE = 4_000_000

/** Rate applied to ISA profits ABOVE the 비과세 threshold: 9.9% 분리과세. */
export const ISA_OVER_LIMIT_RATE = 0.099

/** Korean domestic dividend withholding rate for 일반계좌. */
export const GENERAL_KR_RATE = 0.154

/** US dividend withholding rate (KR-US treaty). Applies to ALL account types regardless
 *  of the Korean wrapper — the Korean wrapper can only shelter Korean tax liability. */
export const US_WITHHOLDING_RATE = 0.15

/** 연금소득세 rates (age-tiered, applied at qualified withdrawal, not per-dividend). */
export const PENSION_WITHDRAWAL_RATES = {
  under70: 0.055,
  age70to79: 0.044,
  age80plus: 0.033,
} as const

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DividendTaxInput {
  /** Gross dividend in KRW (US amounts must be pre-converted via usdToKrw). */
  gross: number
  market: Market
  accountType: AccountType
  /** ISA sub-type; only relevant when accountType === 'ISA'. Default: 'GENERAL_TYPE'. */
  isaType?: IsaType
  /** Age of investor at the withdrawal horizon; only used for PENSION withdrawal-phase tax.
   *  During accumulation this field is ignored (PENSION accumulation is tax-deferred). */
  ageAtWithdrawal?: number
  /** Cumulative ISA profits so far (배당+이자), for threshold tracking.
   *  Both KR and US dividends count toward this limit. Default: 0. */
  isaProfitToDate?: number
}

// ---------------------------------------------------------------------------
// Per-dividend accumulation tax
// Used inside the projection loop for each monthly dividend payment.
// ---------------------------------------------------------------------------

/**
 * Return the TAX AMOUNT on a single dividend payment during the accumulation phase.
 *
 * PENSION-KR: 0 (fully deferred; withdrawal tax applied separately at horizon end)
 * PENSION-US: 15% US withholding (cannot be deferred or sheltered by the Korean wrapper)
 * ISA-KR:     0% below profit threshold / 9.9% on the over-threshold portion
 * ISA-US:     15% US withholding (ISA shelters only Korean tax; US withholding is non-refundable)
 * GENERAL-KR: 15.4%
 * GENERAL-US: 15% (KR-US treaty)
 */
export function dividendTax(input: DividendTaxInput): number {
  const { gross, market, accountType, isaType = 'GENERAL_TYPE', isaProfitToDate = 0 } = input
  if (gross <= 0) return 0

  switch (accountType) {
    case 'PENSION':
      // Accumulation is tax-deferred; US withholding is collected at source regardless.
      return market === 'US' ? gross * US_WITHHOLDING_RATE : 0

    case 'ISA': {
      // US withholding always applies — ISA cannot shelter foreign-source withholding.
      const usTax = market === 'US' ? gross * US_WITHHOLDING_RATE : 0
      if (market === 'US') return usTax   // no additional Korean tax for ISA-US

      // ISA-KR: check profit threshold.
      // Both KR and US dividends count toward isaProfitToDate (AC-S7).
      const limit = isaType === 'PREFERENCE_TYPE'
        ? ISA_TAX_FREE_LIMIT_PREFERENCE
        : ISA_TAX_FREE_LIMIT_GENERAL
      const headroom = Math.max(0, limit - isaProfitToDate)
      const overThreshold = Math.max(0, gross - headroom)
      return overThreshold * ISA_OVER_LIMIT_RATE
    }

    case 'GENERAL':
      return market === 'KR'
        ? gross * GENERAL_KR_RATE
        : gross * US_WITHHOLDING_RATE
  }
}

// ---------------------------------------------------------------------------
// PENSION withdrawal tax (applied once at horizon end, not per-dividend)
// ---------------------------------------------------------------------------

/**
 * Return the 연금소득세 RATE for the given age at qualified withdrawal.
 * Early withdrawal (기타소득세 16.5%) is out of scope; caller must ensure qualified withdrawal.
 */
export function pensionWithdrawalRate(ageAtWithdrawal: number): number {
  if (ageAtWithdrawal >= 80) return PENSION_WITHDRAWAL_RATES.age80plus
  if (ageAtWithdrawal >= 70) return PENSION_WITHDRAWAL_RATES.age70to79
  return PENSION_WITHDRAWAL_RATES.under70
}

/**
 * Return the total 연금소득세 on the full accumulated PENSION value at withdrawal.
 * Applies to the full withdrawn amount (including the already-withheld US portion
 * — this is the conservative model documented in the plan ADR).
 */
export function pensionWithdrawalTax(accumulatedValue: number, ageAtWithdrawal: number): number {
  return accumulatedValue * pensionWithdrawalRate(ageAtWithdrawal)
}
