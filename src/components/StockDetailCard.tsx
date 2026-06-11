import { useState, useEffect } from 'react'
import type { StockQuote } from '../api/client.js'
import { fetchFxRate } from '../api/client.js'
import { usdToKrw } from '../domain/fx.js'
import { formatKrw, formatPercent } from '../lib/format.js'
import { calcDividendEstimates } from '../domain/dividendCalc.js'
import { getHoldings } from '../store/holdingsStore.js'
import AddHoldingModal from './AddHoldingModal.js'

interface Props {
  quote: StockQuote
  onAdded?: () => void
}

export default function StockDetailCard({ quote, onAdded }: Props) {
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

  const today = new Date().toISOString().slice(0, 10)
  const { annualDps } = calcDividendEstimates(
    quote.dividendEvents, today, today.slice(0, 4), today.slice(0, 7)
  )
  const computedYield = quote.price > 0 ? annualDps / quote.price : 0

  const isAlreadyHeld = getHoldings().some(h => h.ticker === quote.ticker)
  const recentEvents = quote.dividendEvents.slice(-4).reverse()
  const yieldColor = computedYield > 0 ? 'text-emerald-600' : 'text-slate-400'

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden max-w-lg">
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white text-xl font-extrabold tracking-wide">{quote.ticker}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">
                  {quote.market}
                </span>
              </div>
              <p className="text-slate-400 text-sm">{quote.name}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-white font-bold text-lg">
                {quote.price.toLocaleString('ko-KR')}
                <span className="text-slate-400 text-sm font-normal ml-1">{quote.currency}</span>
              </div>
              {quote.currency === 'USD' && krwPrice !== null && (
                <div className="text-slate-400 text-xs mt-0.5">≈ {formatKrw(krwPrice)}</div>
              )}
              {fxError && <div className="text-red-400 text-xs mt-0.5">환율 조회 실패</div>}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
          <div className="px-5 py-3">
            <p className="text-xs text-slate-400 mb-0.5">연간 배당수익률</p>
            <p className={`text-lg font-bold ${yieldColor}`}>
              {formatPercent(computedYield)}
            </p>
          </div>
          <div className="px-5 py-3">
            <p className="text-xs text-slate-400 mb-0.5">최근 배당 이력</p>
            <p className="text-lg font-bold text-slate-700">{recentEvents.length}건</p>
          </div>
        </div>

        {/* Dividend history */}
        {recentEvents.length > 0 && (
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">최근 배당 내역</p>
            <div className="space-y-1.5">
              {recentEvents.map((ev) => (
                <div
                  key={ev.exDate + ev.ticker}
                  className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-3 text-slate-500">
                    <span>배당락일 <span className="text-slate-700 font-medium">{ev.exDate}</span></span>
                    {ev.paymentDate && (
                      <span>지급 <span className="text-slate-700 font-medium">{ev.paymentDate}</span></span>
                    )}
                  </div>
                  <span className="font-semibold text-slate-800">
                    {ev.dps.toFixed(4)}
                    <span className="text-slate-400 font-normal text-xs ml-1">{ev.currency}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-5 py-4">
          <button
            onClick={() => setModalOpen(true)}
            disabled={isAlreadyHeld}
            className="w-full py-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            {isAlreadyHeld ? '이미 보유 중인 종목' : '보유종목에 추가'}
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
