import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { StockQuote } from '../api/client.js'
import { fetchFxRate } from '../api/client.js'
import { usdToKrw } from '../domain/fx.js'
import { formatKrw, formatPercent } from '../lib/format.js'
import AddHoldingModal from './AddHoldingModal.js'

interface Props {
  quote: StockQuote
  onAdded?: () => void
}

export default function StockDetailCard({ quote, onAdded }: Props) {
  const navigate = useNavigate()
  const [krwPrice, setKrwPrice] = useState<number | null>(null)
  const [fxError, setFxError] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    setFxError(false)
    if (quote.currency === 'USD') {
      fetchFxRate()
        .then((fx) => setKrwPrice(usdToKrw(quote.price, fx.usdkrw)))
        .catch(() => { setKrwPrice(null); setFxError(true) })
    } else {
      setKrwPrice(quote.price)
    }
  }, [quote.ticker])

  return (
    <>
      <div style={{ border: '1px solid #ccc', padding: 16, borderRadius: 8, maxWidth: 480 }}>
        <h2>{quote.name} ({quote.ticker})</h2>
        <p>
          <strong>현재가:</strong> {quote.price.toLocaleString('ko-KR')} {quote.currency}
          {quote.currency === 'USD' && krwPrice !== null && <> &nbsp;/ {formatKrw(krwPrice)} (KRW 환산)</>}
          {fxError && <span style={{ color: 'red', fontSize: '0.85em' }}> (환율 조회 실패)</span>}
        </p>
        <p><strong>연간 배당수익률:</strong> {formatPercent(quote.annualDividendYield)}</p>
        {quote.dividendEvents.length > 0 && (
          <div>
            <strong>배당 일정:</strong>
            <ul>
              {quote.dividendEvents.slice(0, 4).map((ev) => (
                <li key={ev.exDate + ev.ticker}>
                  배당락일: {ev.exDate} &nbsp;|&nbsp; 지급일: {ev.paymentDate} &nbsp;|&nbsp; DPS: {ev.dps} {ev.currency}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={() => setModalOpen(true)}>보유종목에 추가</button>
          <button onClick={() => navigate(`/scenario?ticker=${encodeURIComponent(quote.ticker)}`)}>
            시나리오 열기
          </button>
        </div>
      </div>
      {modalOpen && (
        <AddHoldingModal
          ticker={quote.ticker}
          market={quote.market}
          onClose={() => setModalOpen(false)}
          onAdded={() => onAdded?.()}
        />
      )}
    </>
  )
}
