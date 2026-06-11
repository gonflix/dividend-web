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
  showAfterTax: boolean
}

interface TooltipPayloadItem {
  dataKey: string
  value: number
  fill: string
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((sum, p) => sum + (Number(p.value) || 0), 0)
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: 6, fontSize: '0.85em' }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.fill }}>
          {p.dataKey}: {formatKrw(p.value)}
        </div>
      ))}
      <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 4, paddingTop: 4, fontWeight: 600 }}>
        합계: {formatKrw(total)}
      </div>
    </div>
  )
}

export default function ScenarioChart({ projections, years, fxRate, priceData, showAfterTax }: Props) {
  const tickers = [...projections.keys()]

  const data = Array.from({ length: years }, (_, i) => {
    const entry: Record<string, number | string> = { year: `${i + 1}년` }
    for (const ticker of tickers) {
      const series = projections.get(ticker)!
      const curr = series[i]
      if (!curr) { entry[ticker] = 0; continue }
      const cumulValue = showAfterTax
        ? curr.cumulativeNetDividend
        : curr.cumulativeGrossDividend
      const currency = priceData.get(ticker)?.currency ?? 'KRW'
      entry[ticker] = Math.round(currency === 'USD' && fxRate ? cumulValue * fxRate : cumulValue)
    }
    return entry
  })

  if (tickers.length === 0) return null

  return (
    <div style={{ marginBottom: 32 }}>
      <h2>누적 배당수익 ({showAfterTax ? '세후' : '세전'}, KRW)</h2>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis tickFormatter={(v: number) => `${(v / 10_000).toFixed(0)}만`} />
            <Tooltip content={<CustomTooltip />} />
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
