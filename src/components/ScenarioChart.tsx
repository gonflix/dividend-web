import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { StockYearData } from '../domain/projection.js'
import type { StockQuote } from '../api/client.js'
import { formatKrw } from '../lib/format.js'

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']

interface Props {
  projections: Map<string, StockYearData[]>
  years: number
  fxRate: number | null
  priceData: Map<string, StockQuote | null>
}

export default function ScenarioChart({ projections, years, fxRate, priceData }: Props) {
  const tickers = [...projections.keys()]

  const data = Array.from({ length: years }, (_, i) => {
    const entry: Record<string, number | string> = { year: `${i + 1}년` }
    for (const ticker of tickers) {
      const series = projections.get(ticker)!
      const curr = series[i]
      const prev = series[i - 1]
      if (!curr) { entry[ticker] = 0; continue }
      const annualNet = curr.cumulativeNetDividend - (prev?.cumulativeNetDividend ?? 0)
      const currency = priceData.get(ticker)?.currency ?? 'KRW'
      entry[ticker] = Math.round(currency === 'USD' && fxRate ? annualNet * fxRate : annualNet)
    }
    return entry
  })

  if (tickers.length === 0) return null

  return (
    <div style={{ marginBottom: 32 }}>
      <h2>연간 배당수익 (세후, KRW)</h2>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis tickFormatter={(v: number) => `${(v / 10_000).toFixed(0)}만`} />
            <Tooltip formatter={(v: unknown) => formatKrw(Number(v))} />
            <Legend />
            {tickers.map((ticker, i) => (
              <Bar key={ticker} dataKey={ticker} stackId="a" fill={COLORS[i % COLORS.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
