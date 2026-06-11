import type { StockQuote, DividendEvent, FxRate } from './dto.js'

const BASE = 'https://query1.finance.yahoo.com'
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; dividend-web/1.0)' }

// ---------------------------------------------------------------------------
// Public fetch functions
// ---------------------------------------------------------------------------

export async function fetchStockQuote(ticker: string): Promise<StockQuote> {
  const enc = encodeURIComponent(ticker)
  const url = `${BASE}/v8/finance/chart/${enc}?interval=1d&range=5y&events=dividends`
  const resp = await fetch(url, { headers: HEADERS })
  if (!resp.ok) throw new Error(`Yahoo chart ${resp.status} for ${ticker}`)
  const data = await resp.json()
  return normalizeChart(ticker, data)
}

export async function fetchUsdKrw(): Promise<FxRate> {
  const url = `${BASE}/v8/finance/chart/USDKRW%3DX?interval=1d&range=1d`
  const resp = await fetch(url, { headers: HEADERS })
  if (!resp.ok) throw new Error(`Yahoo FX ${resp.status}`)
  const data = await resp.json()
  return normalizeFx(data)
}

export async function fetchUsDividendDates(ticker: string): Promise<DividendEvent[]> {
  const enc = encodeURIComponent(ticker)
  const url = `${BASE}/v8/finance/chart/${enc}?interval=1d&range=2y&events=dividends`
  const resp = await fetch(url, { headers: HEADERS })
  if (!resp.ok) return []
  const data = await resp.json()
  return extractDividends(ticker, data)
}

// ---------------------------------------------------------------------------
// Normalizers (exported for fixture-based testing)
// ---------------------------------------------------------------------------

export function normalizeChart(ticker: string, raw: YahooChartResponse): StockQuote {
  const result = raw?.chart?.result?.[0]
  if (!result) throw new Error(`No chart result for ${ticker}`)
  const meta = result.meta
  const dividendEvents = extractDividends(ticker, raw)
  const currency = meta.currency ?? 'USD'
  const isKR = currency === 'KRW' || ticker.endsWith('.KS') || ticker.endsWith('.KQ')
  return {
    ticker,
    market: isKR ? 'KR' : 'US',
    name: meta.longName ?? meta.shortName ?? ticker,
    price: meta.regularMarketPrice ?? 0,
    currency,
    annualDividendYield: meta.trailingAnnualDividendYield ?? 0,
    dividendEvents,
    asOf: new Date((meta.regularMarketTime ?? 0) * 1000).toISOString().slice(0, 10),
  }
}

export function normalizeFx(raw: YahooChartResponse): FxRate {
  const result = raw?.chart?.result?.[0]
  if (!result) throw new Error('No FX result')
  const price = result.meta.regularMarketPrice
  if (!price || price <= 0) throw new Error('Invalid FX price')
  return {
    usdkrw: price,
    asOf: new Date((result.meta.regularMarketTime ?? 0) * 1000).toISOString().slice(0, 10),
  }
}

export function extractDividends(ticker: string, raw: YahooChartResponse): DividendEvent[] {
  const result = raw?.chart?.result?.[0]
  const currency = result?.meta?.currency ?? 'USD'
  const divMap = result?.events?.dividends ?? {}
  return Object.values(divMap).map((d) => ({
    ticker,
    exDate: new Date(d.date * 1000).toISOString().slice(0, 10),
    paymentDate: null,
    dps: d.amount,
    currency,
  }))
}

// ---------------------------------------------------------------------------
// Raw response shapes (loose — Yahoo can change these)
// ---------------------------------------------------------------------------

interface YahooMeta {
  symbol?: string
  longName?: string
  shortName?: string
  currency?: string
  regularMarketPrice?: number
  regularMarketTime?: number
  trailingAnnualDividendYield?: number
}

interface YahooDividendEntry {
  amount: number
  date: number
}

interface YahooChartResult {
  meta: YahooMeta
  events?: { dividends?: Record<string, YahooDividendEntry> }
}

export interface YahooChartResponse {
  chart?: { result?: YahooChartResult[]; error?: unknown }
}
