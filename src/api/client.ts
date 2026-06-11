import type { StockQuote, FxRate, DividendEvent } from '../../api/_lib/dto.js'

export type { StockQuote, FxRate, DividendEvent }

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

export function fetchStock(ticker: string): Promise<StockQuote> {
  return apiFetch<StockQuote>(`/api/stock/${encodeURIComponent(ticker)}`)
}

export function fetchFxRate(): Promise<FxRate> {
  return apiFetch<FxRate>('/api/fx/usdkrw')
}

export function fetchCalendar(ticker: string, market: 'KR' | 'US'): Promise<DividendEvent[]> {
  return apiFetch<DividendEvent[]>(`/api/calendar/${market}?ticker=${encodeURIComponent(ticker)}`)
}
