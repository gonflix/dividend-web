import type { DividendEvent } from '../api/client.js'

const QUARTERLY_MONTHS = new Set([3, 6, 9, 12])

function effectiveDate(ev: DividendEvent): string {
  return ev.paymentDate ?? ev.exDate
}

function detectFrequency(events: DividendEvent[]): 'monthly' | 'quarterly' {
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - 15)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  const recentPaid = events.filter(ev => effectiveDate(ev) >= cutoffStr)
  const uniqueMonths = new Set(recentPaid.map(ev => effectiveDate(ev).slice(0, 7)))
  return uniqueMonths.size >= 8 ? 'monthly' : 'quarterly'
}

export function calcDividendEstimates(
  events: DividendEvent[],
  today: string,            // YYYY-MM-DD
  currentYear: string,      // YYYY
  currentYearMonth: string, // YYYY-MM
): { annualDps: number; thisMonthDps: number } {
  if (events.length === 0) return { annualDps: 0, thisMonthDps: 0 }

  const freq = detectFrequency(events)

  const yearEvents = events
    .filter(ev => effectiveDate(ev).startsWith(currentYear))
    .sort((a, b) => effectiveDate(a).localeCompare(effectiveDate(b)))

  const paidYearEvents = yearEvents.filter(ev => effectiveDate(ev) <= today)
  const paidSum = paidYearEvents.reduce((s, ev) => s + ev.dps, 0)

  const lastPaidDps = [...events]
    .filter(ev => effectiveDate(ev) <= today)
    .sort((a, b) => effectiveDate(b).localeCompare(effectiveDate(a)))
    [0]?.dps ?? 0

  const currentMonthNum = parseInt(currentYearMonth.slice(5, 7))

  if (freq === 'quarterly') {
    const paidQuarterMonths = new Set(
      paidYearEvents.map(ev => parseInt(effectiveDate(ev).slice(5, 7)))
    )
    const remainingCount = [...QUARTERLY_MONTHS].filter(m => !paidQuarterMonths.has(m)).length
    const annualDps = paidSum + remainingCount * lastPaidDps

    let thisMonthDps = 0
    if (QUARTERLY_MONTHS.has(currentMonthNum)) {
      const thisMonthPaid = paidYearEvents.find(
        ev => parseInt(effectiveDate(ev).slice(5, 7)) === currentMonthNum
      )
      thisMonthDps = thisMonthPaid ? thisMonthPaid.dps : lastPaidDps
    }

    return { annualDps, thisMonthDps }
  }

  // monthly
  const paidMonthNums = new Set(
    paidYearEvents.map(ev => parseInt(effectiveDate(ev).slice(5, 7)))
  )
  const remainingCount = Array.from({ length: 12 }, (_, i) => i + 1)
    .filter(m => !paidMonthNums.has(m)).length
  const annualDps = paidSum + remainingCount * lastPaidDps

  const thisMonthPaid = paidYearEvents.find(ev =>
    effectiveDate(ev).startsWith(currentYearMonth)
  )
  const thisMonthDps = thisMonthPaid ? thisMonthPaid.dps : lastPaidDps

  return { annualDps, thisMonthDps }
}

export function calcDividendGrowthCagr(
  events: DividendEvent[],
  today: string,
): number {
  const paid = [...events]
    .filter(ev => effectiveDate(ev) <= today)
    .sort((a, b) => effectiveDate(b).localeCompare(effectiveDate(a)))

  if (paid.length === 0) return 0

  const latest = paid[0]
  const latestDps = latest.dps
  const latestDateStr = effectiveDate(latest)

  const fiveYearsAgoYear = parseInt(latestDateStr.slice(0, 4)) - 5
  const targetPrefix = `${fiveYearsAgoYear}-${latestDateStr.slice(5, 7)}`

  const fiveYearAgo = events.find(ev => effectiveDate(ev).startsWith(targetPrefix))
  if (!fiveYearAgo || fiveYearAgo.dps <= 0 || latestDps <= 0) return 0

  return Math.pow(latestDps / fiveYearAgo.dps, 1 / 5) - 1
}
