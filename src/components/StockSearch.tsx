import { useState } from 'react'
import type { StockQuote } from '../api/client.js'
import { fetchStock } from '../api/client.js'

interface Props {
  onResult: (quote: StockQuote) => void
}

export default function StockSearch({ onResult }: Props) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const ticker = input.trim().toUpperCase()
    if (!ticker) return
    setLoading(true)
    setError(null)
    try {
      const quote = await fetchStock(ticker)
      onResult(quote)
    } catch (err) {
      setError(err instanceof Error ? err.message : '조회 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="티커 입력 (예: AAPL, 005930)"
        disabled={loading}
      />
      <button type="submit" disabled={loading}>
        {loading ? '조회 중…' : '조회'}
      </button>
      {error && <span style={{ color: 'red' }}>{error}</span>}
    </form>
  )
}
