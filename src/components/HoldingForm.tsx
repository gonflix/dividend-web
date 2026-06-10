import { useState } from 'react'
import type { AccountType, Market } from '../domain/types.js'
import { addHolding } from '../store/holdingsStore.js'

interface Props {
  onAdded: () => void
}

export default function HoldingForm({ onAdded }: Props) {
  const [ticker, setTicker] = useState('')
  const [market, setMarket] = useState<Market>('KR')
  const [quantity, setQuantity] = useState('')
  const [costBasis, setCostBasis] = useState('')
  const [accountType, setAccountType] = useState<AccountType>('GENERAL')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const qty = parseFloat(quantity)
    const cost = parseFloat(costBasis)
    if (!ticker.trim()) return setError('티커를 입력하세요')
    if (!isFinite(qty) || qty <= 0) return setError('수량은 양수여야 합니다')
    if (!isFinite(cost) || cost <= 0) return setError('평균단가는 양수여야 합니다')
    try {
      addHolding({ ticker: ticker.trim(), market, quantity: qty, costBasis: cost, accountType })
      setTicker('')
      setQuantity('')
      setCostBasis('')
      onAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 400 }}>
      <label>
        티커
        <input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="AAPL / 005930" />
      </label>
      <label>
        시장
        <select value={market} onChange={(e) => setMarket(e.target.value as Market)}>
          <option value="KR">KR (국내)</option>
          <option value="US">US (미국)</option>
        </select>
      </label>
      <label>
        수량
        <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="10" min="0" step="any" />
      </label>
      <label>
        평균단가 (KRW)
        <input type="number" value={costBasis} onChange={(e) => setCostBasis(e.target.value)} placeholder="50000" min="0" step="any" />
      </label>
      <label>
        계좌 종류
        <select value={accountType} onChange={(e) => setAccountType(e.target.value as AccountType)}>
          <option value="ISA">ISA</option>
          <option value="PENSION">연금저축</option>
          <option value="GENERAL">일반</option>
        </select>
      </label>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit">추가</button>
    </form>
  )
}
