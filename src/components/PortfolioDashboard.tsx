import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import type { StockQuote } from '../api/client.js'
import type { StoredPosition } from '../store/holdingsStore.js'
import { usdToKrw } from '../domain/fx.js'
import { formatAmount, formatPercent } from '../lib/format.js'

interface Props {
  positions: StoredPosition[]
  priceData: Map<string, StockQuote | null>
  fxRate: number | null
  loading: boolean
  currency: 'KRW' | 'USD'
  onCurrencyToggle: () => void
}

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']

function toDisplay(amount: number, nativeCurrency: string, displayCurrency: 'KRW' | 'USD', fxRate: number | null): number | null {
  if (nativeCurrency === displayCurrency) return amount
  if (!fxRate) return null
  if (nativeCurrency === 'USD' && displayCurrency === 'KRW') return usdToKrw(amount, fxRate)
  if (nativeCurrency === 'KRW' && displayCurrency === 'USD') return amount / fxRate
  return amount
}

export default function PortfolioDashboard({ positions, priceData, fxRate, loading, currency, onCurrencyToggle }: Props) {
  if (loading) {
    return (
      <div style={{ padding: '24px 0', color: '#888', textAlign: 'center' }}>
        포트폴리오 데이터 로딩 중…
      </div>
    )
  }

  const currentYearMonth = new Date().toISOString().slice(0, 7)

  let totalValue = 0
  let totalAnnualDividend = 0
  let totalThisMonthDividend = 0
  let weightedYieldNumerator = 0

  const pieData: { name: string; value: number }[] = []

  for (const pos of positions) {
    const quote = priceData.get(pos.ticker)
    if (!quote) continue

    const marketValue = toDisplay(quote.price * pos.quantity, quote.currency, currency, fxRate)
    const annualDiv = toDisplay(quote.annualDividendYield * quote.price * pos.quantity, quote.currency, currency, fxRate)
    if (marketValue === null || annualDiv === null) continue

    totalValue += marketValue
    totalAnnualDividend += annualDiv
    weightedYieldNumerator += quote.annualDividendYield * marketValue

    for (const ev of quote.dividendEvents) {
      if (ev.paymentDate?.startsWith(currentYearMonth)) {
        const divAmount = toDisplay(ev.dps * pos.quantity, ev.currency, currency, fxRate)
        if (divAmount !== null) totalThisMonthDividend += divAmount
      }
    }

    pieData.push({ name: pos.ticker, value: marketValue })
  }

  const weightedYield = totalValue > 0 ? (weightedYieldNumerator / totalValue) * 100 : null

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>포트폴리오</h2>
        <button onClick={onCurrencyToggle} style={{ fontSize: '0.85em', padding: '4px 10px' }}>
          {currency === 'KRW' ? 'KRW → USD' : 'USD → KRW'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {pieData.length > 0 ? (
          <PieChart width={280} height={260}>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name }) => name}>
              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => typeof v === 'number' ? formatAmount(v, currency) : String(v)} />
            <Legend />
          </PieChart>
        ) : (
          <div style={{ color: '#888', padding: '40px 0' }}>보유 종목이 없거나 시세 조회에 실패했습니다.</div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1, minWidth: 240 }}>
          {[
            { label: '총 평가금액', value: formatAmount(totalValue, currency) },
            { label: '연간 예상 배당금', value: formatAmount(totalAnnualDividend, currency) },
            { label: '이번달 예상 배당금', value: formatAmount(totalThisMonthDividend, currency) },
            { label: '가중평균 배당율', value: weightedYield !== null ? formatPercent(weightedYield / 100) : '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px' }}>
              <div style={{ fontSize: '0.8em', color: '#64748b', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: '1.2em', fontWeight: 600, color: '#1e293b' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
