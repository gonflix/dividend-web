import { useState, useEffect, useCallback } from 'react'
import StockSearch from '../components/StockSearch.js'
import StockDetailCard from '../components/StockDetailCard.js'
import PortfolioDashboard from '../components/PortfolioDashboard.js'
import HoldingsTable from '../components/HoldingsTable.js'
import { getHoldings } from '../store/holdingsStore.js'
import type { StoredPosition } from '../store/holdingsStore.js'
import type { StockQuote, FxRate } from '../api/client.js'
import { fetchStock, fetchFxRate } from '../api/client.js'

export default function HoldingsPage() {
  const [positions, setPositions] = useState<StoredPosition[]>([])
  const [priceData, setPriceData] = useState<Map<string, StockQuote | null>>(new Map())
  const [fxRate, setFxRate] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [currency, setCurrency] = useState<'KRW' | 'USD'>('KRW')
  const [searchQuote, setSearchQuote] = useState<StockQuote | null>(null)

  const loadData = useCallback(async () => {
    const holdings = getHoldings()
    setPositions(holdings)
    setLoading(true)

    const [fxResult, ...quoteResults] = await Promise.allSettled([
      fetchFxRate(),
      ...holdings.map((h) => fetchStock(h.ticker)),
    ])

    if (fxResult.status === 'fulfilled') {
      setFxRate((fxResult.value as FxRate).usdkrw)
    }

    const map = new Map<string, StockQuote | null>()
    holdings.forEach((h, i) => {
      const result = quoteResults[i]
      map.set(h.ticker, result.status === 'fulfilled' ? (result.value as StockQuote) : null)
    })
    setPriceData(map)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function handleAdded() {
    setSearchQuote(null)
    loadData()
  }

  return (
    <div>
      <h1>보유종목</h1>

      <section style={{ marginBottom: 24 }}>
        <StockSearch onResult={setSearchQuote} />
        {searchQuote && (
          <div style={{ marginTop: 16 }}>
            <StockDetailCard quote={searchQuote} onAdded={handleAdded} />
          </div>
        )}
      </section>

      <hr />

      <PortfolioDashboard
        positions={positions}
        priceData={priceData}
        fxRate={fxRate}
        loading={loading}
        currency={currency}
        onCurrencyToggle={() => setCurrency((c) => (c === 'KRW' ? 'USD' : 'KRW'))}
      />

      <hr />

      <section style={{ marginTop: 16 }}>
        <h2>보유 종목 목록</h2>
        <HoldingsTable
          positions={positions}
          onRefresh={loadData}
          priceData={priceData}
          fxRate={fxRate}
          currency={currency}
        />
      </section>
    </div>
  )
}
