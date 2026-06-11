import { useState } from 'react'
import type { AccountType, IsaType, Market } from '../domain/types.js'
import { addHolding } from '../store/holdingsStore.js'

interface Props {
  ticker: string
  market: Market
  onClose: () => void
  onAdded: () => void
}

export default function AddHoldingModal({ ticker, market, onClose, onAdded }: Props) {
  const [quantity, setQuantity] = useState('')
  const [accountType, setAccountType] = useState<AccountType>('GENERAL')
  const [isaType, setIsaType] = useState<IsaType>('GENERAL_TYPE')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const qty = parseFloat(quantity)
    if (!isFinite(qty) || qty <= 0) { setError('수량은 양수여야 합니다'); return }
    addHolding({
      ticker,
      market,
      quantity: qty,
      costBasis: 0,
      accountType,
      ...(accountType === 'ISA' ? { isaType } : {}),
    })
    onAdded()
    onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <h3 style={{ margin: 0 }}>보유종목 추가</h3>
        <p style={{ margin: 0, color: '#666', fontSize: '0.9em' }}>{ticker} ({market})</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label>
            수량
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="10"
              min="0"
              step="any"
              style={{ display: 'block', width: '100%', marginTop: 4 }}
            />
          </label>
          <label>
            계좌 종류
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as AccountType)}
              style={{ display: 'block', width: '100%', marginTop: 4 }}
            >
              <option value="ISA">ISA</option>
              <option value="PENSION">연금저축</option>
              <option value="GENERAL">일반</option>
            </select>
          </label>
          {accountType === 'ISA' && (
            <label>
              ISA 종류
              <select
                value={isaType}
                onChange={(e) => setIsaType(e.target.value as IsaType)}
                style={{ display: 'block', width: '100%', marginTop: 4 }}
              >
                <option value="GENERAL_TYPE">일반형 (비과세 한도 200만원)</option>
                <option value="PREFERENCE_TYPE">서민형 (비과세 한도 400만원)</option>
              </select>
            </label>
          )}
          {error && <p style={{ color: 'red', margin: 0, fontSize: '0.9em' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose}>취소</button>
            <button type="submit">추가</button>
          </div>
        </form>
      </div>
    </div>
  )
}
