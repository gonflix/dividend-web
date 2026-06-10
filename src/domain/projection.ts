import type { Market, AccountType, IsaType, ProjectionModel } from './types.js'
import { dividendTax, pensionWithdrawalTax } from './tax.js'

// ---------------------------------------------------------------------------
// Growth rates per projection model (annual dividend growth)
// ---------------------------------------------------------------------------

const ANNUAL_GROWTH: Record<ProjectionModel, number> = {
  pessimistic: 0.00,   // 0% — flat yield
  base:        0.03,   // 3% annual growth
  optimistic:  0.06,   // 6% annual growth
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProjectInput {
  /** Monthly DCA amount in KRW. */
  monthlyDca: number
  /** Projection horizon in years. */
  years: number
  /** Projection model (affects dividend growth rate). */
  model: ProjectionModel
  /** Annual dividend yield as a decimal (e.g. 0.03 = 3%). */
  annualDividendYield: number
  market: Market
  accountType: AccountType
  isaType?: IsaType
  /** Age at withdrawal horizon end — used for PENSION withdrawal tax (default: 55). */
  ageAtWithdrawal?: number
  /** Starting cumulative ISA profit (for threshold tracking). Default: 0. */
  isaProfitToDate?: number
}

export interface ProjectResult {
  /** Monthly after-per-dividend-tax income series. Length === years * 12 (exclusive of t=0). */
  series: number[]
  /** Total after-all-taxes headline: sum(series) minus PENSION withdrawal tax if applicable. */
  headlineTotal: number
  /** Pre-tax total (sum of gross dividends before per-dividend tax). */
  preTaxTotal: number
}

// ---------------------------------------------------------------------------
// Core projection
// ---------------------------------------------------------------------------

export function project(input: ProjectInput): ProjectResult {
  const {
    monthlyDca,
    years,
    model,
    annualDividendYield,
    market,
    accountType,
    isaType = 'GENERAL_TYPE',
    ageAtWithdrawal = 55,
    isaProfitToDate: startingIsaProfit = 0,
  } = input

  const months = years * 12
  const annualGrowth = ANNUAL_GROWTH[model]
  const series: number[] = []

  let position = 0
  let isaProfitToDate = startingIsaProfit
  let preTaxTotal = 0

  for (let m = 0; m < months; m++) {
    // Monthly DCA increases position
    position += monthlyDca

    // Annual yield grows by the model rate each year
    const yearIndex = Math.floor(m / 12)
    const growthFactor = Math.pow(1 + annualGrowth, yearIndex)
    const effectiveAnnualYield = annualDividendYield * growthFactor
    const monthlyYield = effectiveAnnualYield / 12

    const grossDividend = position * monthlyYield
    preTaxTotal += grossDividend

    const tax = dividendTax({
      gross: grossDividend,
      market,
      accountType,
      isaType,
      ageAtWithdrawal,
      isaProfitToDate,
    })

    const afterTaxDividend = grossDividend - tax
    series.push(afterTaxDividend)

    // Reinvest after-tax dividend back into position
    position += afterTaxDividend

    // Track ISA profit for threshold (both KR and US dividends count — AC-S7)
    if (accountType === 'ISA') {
      isaProfitToDate += grossDividend
    }
  }

  // Total after per-dividend taxes
  const sumAfterPerDivTax = series.reduce((a, b) => a + b, 0)

  // PENSION: apply withdrawal tax on total accumulated dividends at horizon end
  let headlineTotal = sumAfterPerDivTax
  if (accountType === 'PENSION') {
    const withdrawalTax = pensionWithdrawalTax(sumAfterPerDivTax, ageAtWithdrawal)
    headlineTotal = sumAfterPerDivTax - withdrawalTax
  }

  return { series, headlineTotal, preTaxTotal }
}
