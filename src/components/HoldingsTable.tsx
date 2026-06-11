import { useState } from 'react'
import type { StockQuote } from '../api/client.js'
import type { StoredPosition } from '../store/holdingsStore.js'
import { deleteHolding, updateHolding } from '../store/holdingsStore.js'
import type { AccountType } from '../domain/types.js'
import { usdToKrw } from '../domain/fx.js'
import { calcDividendEstimates } from '../domain/dividendCalc.js'
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

function toDisplay(
  amount: number,
  nativeCurrency: string,
  displayCurrency: 'KRW' | 'USD',
  fxRate: number | null | undefined,
): number | null {
  if (nativeCurrency === displayCurrency) return amount
  if (!fxRate) return null
  if (nativeCurrency === 'USD' && displayCurrency === 'KRW') return usdToKrw(amount, fxRate)
  if (nativeCurrency === 'KRW' && displayCurrency === 'USD') return amount / fxRate
  return amount
}

export default function HoldingsTable({ positions, onRefresh, priceData, fxRate, currency = 'KRW' }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ quantity: number; costBasis: number; accountType: AccountType }>({
    quantity: 0, costBasis: 0, accountType: 'GENERAL',
  })

  if (positions.length === 0) {
    return <p className="text-slate-400 py-4">보유 종목이 없습니다. 종목을 검색하여 추가하세요.</p>
  }

  function handleDelete(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    deleteHolding(id)
    onRefresh()
  }

  function startEdit(p: StoredPosition) {
    setEditingId(p.id)
    setEditForm({ quantity: p.quantity, costBasis: p.costBasis, accountType: p.accountType })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  function saveEdit() {
    if (!editingId) return
    updateHolding(editingId, editForm)
    setEditingId(null)
    window.location.reload()
  }

  const today = new Date().toISOString().slice(0, 10)
  const currentYear = today.slice(0, 4)
  const currentYearMonth = today.slice(0, 7)

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left font-semibold text-slate-600">티커</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">종목명</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">시장</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">수량</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">평가액</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">연배당금</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">계좌</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {positions.map((p) => {
              const quote = priceData?.get(p.ticker)
              const isEditing = editingId === p.id

              if (isEditing) {
                return (
                  <tr key={p.id} className="bg-blue-50">
                    <td colSpan={8} className="px-4 py-3">
                      <div className="flex flex-wrap items-end gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-slate-500">수량</label>
                          <input
                            type="number"
                            min={1}
                            value={editForm.quantity}
                            onChange={e => setEditForm(f => ({ ...f, quantity: parseInt(e.target.value) || 0 }))}
                            className="w-28 px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-slate-500">평균단가</label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={editForm.costBasis}
                            onChange={e => setEditForm(f => ({ ...f, costBasis: parseFloat(e.target.value) || 0 }))}
                            className="w-32 px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-slate-500">계좌종류</label>
                          <select
                            value={editForm.accountType}
                            onChange={e => setEditForm(f => ({ ...f, accountType: e.target.value as AccountType }))}
                            className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none bg-white"
                          >
                            <option value="GENERAL">일반</option>
                            <option value="ISA">ISA</option>
                            <option value="PENSION">연금저축</option>
                          </select>
                        </div>
                        <div className="flex gap-2 ml-auto">
                          <button
                            onClick={saveEdit}
                            className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                          >
                            저장
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-600 text-sm font-medium rounded-lg border border-slate-200 transition-colors"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              }

              const marketValue = quote
                ? toDisplay(quote.price * p.quantity, quote.currency, currency, fxRate)
                : null
              const annualDiv = quote
                ? toDisplay(
                    calcDividendEstimates(quote.dividendEvents, today, currentYear, currentYearMonth).annualDps * p.quantity,
                    quote.currency, currency, fxRate,
                  )
                : null

              return (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-800">{p.ticker}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate">
                    {quote?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                      {p.market}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-800">{p.quantity.toLocaleString('ko-KR')}</td>
                  <td className="px-4 py-3 text-right text-slate-800 font-medium">
                    {marketValue !== null ? formatAmount(marketValue, currency) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-800 font-medium">
                    {annualDiv !== null ? formatAmount(annualDiv, currency) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                      {ACCOUNT_LABEL[p.accountType] ?? p.accountType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => startEdit(p)}
                        className="px-3 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-colors"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="px-3 py-1 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
