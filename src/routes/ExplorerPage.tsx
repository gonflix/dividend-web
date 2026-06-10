import { useState } from 'react'
import StockSearch from '../components/StockSearch.js'
import StockDetailCard from '../components/StockDetailCard.js'
import type { StockQuote } from '../api/client.js'

export default function ExplorerPage() {
  const [quote, setQuote] = useState<StockQuote | null>(null)

  return (
    <div>
      <h1>종목 탐색</h1>
      <StockSearch onResult={setQuote} />
      {quote && <div style={{ marginTop: 16 }}><StockDetailCard quote={quote} /></div>}
    </div>
  )
}
