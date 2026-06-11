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
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="티커 입력 (예: AAPL, 005930)"
        disabled={loading}
        className="w-72 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
      />
      <button
        type="submit"
        disabled={loading}
        className="px-5 py-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
      >
        {loading ? '조회 중…' : '조회'}
      </button>
      {error && <span className="text-red-500 text-sm">{error}</span>}
    </form>
  )
}
