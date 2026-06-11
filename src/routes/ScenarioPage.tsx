import { useState, useEffect, useCallback, useMemo } from 'react'
import { getHoldings } from '../store/holdingsStore.js'
import type { StoredPosition } from '../store/holdingsStore.js'
import { fetchStock, fetchFxRate } from '../api/client.js'
import type { StockQuote } from '../api/client.js'
import type { AccountType, IsaType, ProjectionModel } from '../domain/types.js'
import { calcDividendEstimates, calcDividendGrowthCagr } from '../domain/dividendCalc.js'
import { projectStock } from '../domain/projection.js'
import type { StockYearData } from '../domain/projection.js'
import ScenarioChart from '../components/ScenarioChart.js'
import ScenarioResultsTable from '../components/ScenarioResultsTable.js'
import { formatPercent } from '../lib/format.js'

interface TickerSettings {
  monthlyDca: number
  currency: 'KRW' | 'USD'
  accountType: AccountType
  isaType: IsaType
  ageAtWithdrawal: number
  model: ProjectionModel
}

const DEFAULT_SETTINGS: TickerSettings = {
  monthlyDca: 500_000,
  currency: 'KRW',
  accountType: 'GENERAL',
  isaType: 'GENERAL_TYPE',
  ageAtWithdrawal: 55,
  model: 'base',
}

const TH: React.CSSProperties = {
  padding: '8px 10px', fontWeight: 600, fontSize: '0.85em',
  color: '#475569', textAlign: 'left', background: '#f1f5f9',
  borderBottom: '2px solid #e2e8f0',
}
const TD: React.CSSProperties = { padding: '8px 10px', fontSize: '0.9em' }

export default function ScenarioPage() {
  const [holdings, setHoldings] = useState<StoredPosition[]>([])
  const [priceData, setPriceData] = useState<Map<string, StockQuote | null>>(new Map())
  const [fxRate, setFxRate] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [years, setYears] = useState(10)
  const [showAfterTax, setShowAfterTax] = useState(false)
  const [settings, setSettings] = useState<Record<string, TickerSettings>>({})

  const loadData = useCallback(async () => {
    const h = getHoldings()
    setHoldings(h)
    setSettings(prev => {
      const next = { ...prev }
      for (const p of h) {
        if (!next[p.ticker]) {
          next[p.ticker] = {
            ...DEFAULT_SETTINGS,
            accountType: p.accountType,
            isaType: p.isaType ?? 'GENERAL_TYPE',
            currency: p.market === 'US' ? 'USD' : 'KRW',
          }
        }
      }
      return next
    })
    if (h.length === 0) return
    setLoading(true)
    const [fxResult, ...quoteResults] = await Promise.allSettled([
      fetchFxRate(),
      ...h.map(p => fetchStock(p.ticker)),
    ])
    if (fxResult.status === 'fulfilled') setFxRate(fxResult.value.usdkrw)
    const map = new Map<string, StockQuote | null>()
    h.forEach((p, i) => {
      const r = quoteResults[i]
      map.set(p.ticker, r.status === 'fulfilled' ? r.value : null)
    })
    setPriceData(map)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function patch(ticker: string, update: Partial<TickerSettings>) {
    setSettings(prev => ({
      ...prev,
      [ticker]: { ...(prev[ticker] ?? DEFAULT_SETTINGS), ...update },
    }))
  }

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const currentYear = today.slice(0, 4)
  const currentYearMonth = today.slice(0, 7)

  const projections = useMemo<Map<string, StockYearData[]>>(() => {
    const result = new Map<string, StockYearData[]>()
    for (const pos of holdings) {
      const quote = priceData.get(pos.ticker)
      const s = settings[pos.ticker]
      if (!quote || !s) continue

      const { annualDps } = calcDividendEstimates(quote.dividendEvents, today, currentYear, currentYearMonth)
      const cagr = calcDividendGrowthCagr(quote.dividendEvents, today)

      let monthlyDcaNative = s.monthlyDca
      if (s.currency === 'KRW' && quote.currency === 'USD' && fxRate) {
        monthlyDcaNative = s.monthlyDca / fxRate
      } else if (s.currency === 'USD' && quote.currency === 'KRW' && fxRate) {
        monthlyDcaNative = s.monthlyDca * fxRate
      }

      result.set(pos.ticker, projectStock({
        initialShares: pos.quantity,
        currentPrice: quote.price,
        annualDps,
        dividendCagr: cagr,
        model: s.model,
        monthlyDca: monthlyDcaNative,
        years,
        market: quote.market,
        accountType: s.accountType,
        isaType: s.isaType,
        ageAtWithdrawal: s.ageAtWithdrawal,
      }))
    }
    return result
  }, [holdings, priceData, settings, fxRate, years, today, currentYear, currentYearMonth])

  if (holdings.length === 0 && !loading) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-extrabold text-slate-800">시나리오 시뮬레이터</h1>
        <p className="text-slate-400">보유 종목이 없습니다. 먼저 보유종목 탭에서 종목을 추가하세요.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-slate-800 mb-5">시나리오 시뮬레이터</h1>

      <div className="flex flex-wrap gap-3 items-center mb-5">
        <label className="flex items-center gap-2">
          <span className="font-semibold text-slate-700 text-sm">투자기간</span>
          <input
            type="number"
            value={years}
            min={1}
            max={50}
            style={{ width: 60 }}
            onChange={e => setYears(Math.max(1, parseInt(e.target.value) || 1))}
          />
          <span className="text-sm text-slate-600">년</span>
        </label>
        <button
          onClick={() => setShowAfterTax(v => !v)}
          className={`px-4 py-1.5 text-sm font-semibold rounded-lg border transition-colors shadow-sm ${
            showAfterTax
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500'
              : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
          }`}
        >
          {showAfterTax ? '세후 금액 보기 ON' : '세후 금액 보기 OFF'}
        </button>
        {loading && <span className="text-slate-400 text-sm">시세 로딩 중…</span>}
      </div>

      <div style={{ overflowX: 'auto', marginBottom: 32 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 700 }}>
          <thead>
            <tr>
              <th style={TH}>티커</th>
              <th style={{ ...TH, textAlign: 'right' }}>현재수량</th>
              <th style={TH}>월 적립금액</th>
              <th style={TH}>화폐</th>
              <th style={TH}>계좌종류</th>
              <th style={TH}>수익률모델</th>
              <th style={{ ...TH, textAlign: 'right' }}>배당 CAGR</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map(pos => {
              const quote = priceData.get(pos.ticker)
              const s = settings[pos.ticker] ?? DEFAULT_SETTINGS
              const cagr = quote ? calcDividendGrowthCagr(quote.dividendEvents, today) : null
              const cagrColor = cagr === null ? '#888' : cagr >= 0 ? '#10b981' : '#ef4444'

              return (
                <tr key={pos.ticker} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={TD}><strong>{pos.ticker}</strong></td>
                  <td style={{ ...TD, textAlign: 'right' }}>{pos.quantity.toLocaleString('ko-KR')}</td>
                  <td style={TD}>
                    <input
                      type="number"
                      value={s.monthlyDca}
                      min={0}
                      step={s.currency === 'KRW' ? 10000 : 10}
                      style={{ width: 120 }}
                      onChange={e => patch(pos.ticker, { monthlyDca: parseFloat(e.target.value) || 0 })}
                    />
                  </td>
                  <td style={TD}>
                    <select value={s.currency} onChange={e => patch(pos.ticker, { currency: e.target.value as 'KRW' | 'USD' })}>
                      <option value="KRW">KRW</option>
                      <option value="USD">USD</option>
                    </select>
                  </td>
                  <td style={TD}>
                    <select value={s.accountType} onChange={e => patch(pos.ticker, { accountType: e.target.value as AccountType })}>
                      <option value="GENERAL">일반</option>
                      <option value="ISA">ISA</option>
                      <option value="PENSION">연금저축</option>
                    </select>
                  </td>
                  <td style={TD}>
                    <select value={s.model} onChange={e => patch(pos.ticker, { model: e.target.value as ProjectionModel })}>
                      <option value="base">기본 (CAGR)</option>
                      <option value="optimistic">낙관 (CAGR+2%)</option>
                      <option value="pessimistic">보수 (0% 성장)</option>
                    </select>
                  </td>
                  <td style={{ ...TD, textAlign: 'right', color: cagrColor, fontWeight: 600 }}>
                    {cagr !== null ? formatPercent(cagr) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ScenarioChart
        projections={projections}
        years={years}
        fxRate={fxRate}
        priceData={priceData}
        showAfterTax={showAfterTax}
      />

      <ScenarioResultsTable
        holdings={holdings}
        projections={projections}
        years={years}
        priceData={priceData}
        fxRate={fxRate}
        showAfterTax={showAfterTax}
      />
    </div>
  )
}
