import type { StockYearData } from '../domain/projection.js'
import type { StoredPosition } from '../store/holdingsStore.js'
import type { StockQuote } from '../api/client.js'
import { formatKrw } from '../lib/format.js'

interface Props {
  holdings: StoredPosition[]
  projections: Map<string, StockYearData[]>
  years: number
  priceData: Map<string, StockQuote | null>
  fxRate: number | null
}

function toKrw(amount: number, currency: string, fxRate: number | null): number {
  return currency === 'USD' && fxRate ? amount * fxRate : amount
}

const TH: React.CSSProperties = {
  padding: '6px 8px', fontWeight: 600, fontSize: '0.8em',
  color: '#475569', textAlign: 'right',
  border: '1px solid #e2e8f0', whiteSpace: 'nowrap',
}
const THL: React.CSSProperties = { ...TH, textAlign: 'left' }
const TD: React.CSSProperties = {
  padding: '6px 8px', fontSize: '0.8em', textAlign: 'right',
  border: '1px solid #e2e8f0', whiteSpace: 'nowrap',
}
const TDL: React.CSSProperties = { ...TD, textAlign: 'left' }

export default function ScenarioResultsTable({ holdings, projections, years, priceData, fxRate }: Props) {
  const yearCols = Array.from({ length: years }, (_, i) => i + 1)

  return (
    <div style={{ overflowX: 'auto' }}>
      <h2>시나리오 결과</h2>
      <table style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th rowSpan={2} style={THL}>티커</th>
            <th rowSpan={2} style={TH}>현재수량</th>
            <th colSpan={years} style={{ ...TH, textAlign: 'center', background: '#e0e7ff' }}>
              누적 보유수량
            </th>
            <th colSpan={years} style={{ ...TH, textAlign: 'center', background: '#fef3c7' }}>
              누적 배당수익 세전 (KRW)
            </th>
            <th colSpan={years} style={{ ...TH, textAlign: 'center', background: '#d1fae5' }}>
              누적 배당수익 세후 (KRW)
            </th>
          </tr>
          <tr>
            {yearCols.map(y => <th key={`q${y}`} style={{ ...TH, background: '#e0e7ff' }}>{y}년</th>)}
            {yearCols.map(y => <th key={`g${y}`} style={{ ...TH, background: '#fef3c7' }}>{y}년</th>)}
            {yearCols.map(y => <th key={`n${y}`} style={{ ...TH, background: '#d1fae5' }}>{y}년</th>)}
          </tr>
        </thead>
        <tbody>
          {holdings.map(pos => {
            const series = projections.get(pos.ticker)
            const currency = priceData.get(pos.ticker)?.currency ?? 'KRW'

            return (
              <tr key={pos.ticker}>
                <td style={TDL}><strong>{pos.ticker}</strong></td>
                <td style={TD}>{pos.quantity.toLocaleString('ko-KR')}</td>
                {yearCols.map(y => {
                  const d = series?.[y - 1]
                  return <td key={`q${y}`} style={TD}>{d ? d.cumulativeShares.toFixed(2) : '—'}</td>
                })}
                {yearCols.map(y => {
                  const d = series?.[y - 1]
                  return (
                    <td key={`g${y}`} style={TD}>
                      {d ? formatKrw(toKrw(d.cumulativeGrossDividend, currency, fxRate)) : '—'}
                    </td>
                  )
                })}
                {yearCols.map(y => {
                  const d = series?.[y - 1]
                  return (
                    <td key={`n${y}`} style={TD}>
                      {d ? formatKrw(toKrw(d.cumulativeNetDividend, currency, fxRate)) : '—'}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
