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
  showAfterTax: boolean
}

function toKrw(amount: number, currency: string, fxRate: number | null): number {
  return currency === 'USD' && fxRate ? amount * fxRate : amount
}

function selectYearCols(years: number): number[] {
  if (years <= 5) return Array.from({ length: years }, (_, i) => i + 1)
  const result: number[] = []
  for (let i = 0; i < 5; i++) {
    result.push(i === 4 ? years : 1 + Math.floor(i * (years - 1) / 4))
  }
  return result
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

export default function ScenarioResultsTable({ holdings, projections, years, priceData, fxRate, showAfterTax }: Props) {
  const yearCols = selectYearCols(years)
  const M = yearCols.length
  const divColSpan = showAfterTax ? M * 2 : M

  return (
    <div style={{ overflowX: 'auto' }}>
      <h2>시나리오 결과</h2>
      <table style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th rowSpan={2} style={THL}>티커</th>
            <th rowSpan={2} style={TH}>현재수량</th>
            <th colSpan={M} style={{ ...TH, textAlign: 'center', background: '#e0e7ff' }}>
              누적 보유수량
            </th>
            <th colSpan={divColSpan} style={{ ...TH, textAlign: 'center', background: '#fef3c7' }}>
              배당수익 (KRW)
            </th>
          </tr>
          <tr>
            {yearCols.map(y => (
              <th key={`q${y}`} style={{ ...TH, background: '#e0e7ff' }}>{y}년</th>
            ))}
            {yearCols.flatMap(y =>
              showAfterTax
                ? [
                    <th key={`g${y}`} style={{ ...TH, background: '#fef9c3' }}>{y}년 세전</th>,
                    <th key={`n${y}`} style={{ ...TH, background: '#d1fae5' }}>{y}년 세후</th>,
                  ]
                : [<th key={`g${y}`} style={{ ...TH, background: '#fef3c7' }}>{y}년</th>]
            )}
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
                {yearCols.flatMap(y => {
                  const d = series?.[y - 1]
                  const gross = d ? formatKrw(toKrw(d.cumulativeGrossDividend, currency, fxRate)) : '—'
                  const net = d ? formatKrw(toKrw(d.cumulativeNetDividend, currency, fxRate)) : '—'
                  return showAfterTax
                    ? [
                        <td key={`g${y}`} style={TD}>{gross}</td>,
                        <td key={`n${y}`} style={{ ...TD, background: '#f0fdf4' }}>{net}</td>,
                      ]
                    : [<td key={`g${y}`} style={TD}>{gross}</td>]
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
