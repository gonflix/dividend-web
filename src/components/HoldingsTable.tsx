import type { StockQuote } from '../api/client.js'
import type { StoredPosition } from '../store/holdingsStore.js'
import { deleteHolding } from '../store/holdingsStore.js'
import { usdToKrw } from '../domain/fx.js'
import { formatAmount } from '../lib/format.js'

const ACCOUNT_LABEL: Record<string, string> = {
  ISA: 'ISA',
  PENSION: '연금저축',
  GENERAL: '일반',
}

interface Props {
  positions: StoredPosition[]
  onRefresh: () => void
  priceData?: Map<string, StockQuote | null>
  fxRate?: number | null
  currency?: 'KRW' | 'USD'
}

function toDisplay(amount: number, nativeCurrency: string, displayCurrency: 'KRW' | 'USD', fxRate: number | null | undefined): number | null {
  if (nativeCurrency === displayCurrency) return amount
  if (!fxRate) return null
  if (nativeCurrency === 'USD' && displayCurrency === 'KRW') return usdToKrw(amount, fxRate)
  if (nativeCurrency === 'KRW' && displayCurrency === 'USD') return amount / fxRate
  return amount
}

export default function HoldingsTable({ positions, onRefresh, priceData, fxRate, currency = 'KRW' }: Props) {
  if (positions.length === 0) {
    return <p style={{ color: '#888' }}>보유 종목이 없습니다. 종목을 검색하여 추가하세요.</p>
  }

  function handleDelete(id: string) {
    deleteHolding(id)
    onRefresh()
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: '8px 4px' }}>티커</th>
          <th style={{ textAlign: 'left', padding: '8px 4px' }}>시장</th>
          <th style={{ textAlign: 'right', padding: '8px 4px' }}>수량</th>
          <th style={{ textAlign: 'right', padding: '8px 4px' }}>평가액</th>
          <th style={{ textAlign: 'right', padding: '8px 4px' }}>연배당금</th>
          <th style={{ textAlign: 'left', padding: '8px 4px' }}>계좌</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {positions.map((p) => {
          const quote = priceData?.get(p.ticker)
          const marketValue = quote
            ? toDisplay(quote.price * p.quantity, quote.currency, currency, fxRate)
            : null
          const annualDiv = quote
            ? toDisplay(quote.annualDividendYield * quote.price * p.quantity, quote.currency, currency, fxRate)
            : null

          return (
            <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '8px 4px' }}>{p.ticker}</td>
              <td style={{ padding: '8px 4px' }}>{p.market}</td>
              <td style={{ padding: '8px 4px', textAlign: 'right' }}>{p.quantity.toLocaleString('ko-KR')}</td>
              <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                {marketValue !== null ? formatAmount(marketValue, currency) : '—'}
              </td>
              <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                {annualDiv !== null ? formatAmount(annualDiv, currency) : '—'}
              </td>
              <td style={{ padding: '8px 4px' }}>{ACCOUNT_LABEL[p.accountType] ?? p.accountType}</td>
              <td style={{ padding: '8px 4px' }}>
                <button onClick={() => handleDelete(p.id)}>삭제</button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
