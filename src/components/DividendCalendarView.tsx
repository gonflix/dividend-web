import { useState, useEffect, useMemo, useRef } from 'react'
import type { DividendEvent } from '../api/client.js'
import { fetchCalendar, fetchFxRate, fetchStock } from '../api/client.js'
import { getHoldings, type StoredPosition } from '../store/holdingsStore.js'
import type { AccountType } from '../domain/types.js'

const TICKER_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
]
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function dividendTaxRate(accountType: AccountType, currency: string): number {
  if (accountType === 'ISA' || accountType === 'PENSION') return 0
  return currency === 'USD' ? 0.15 : 0.154
}

function fmtKRW(v: number) {
  return '₩' + Math.round(v).toLocaleString('ko-KR')
}
function fmtUSD(v: number) {
  return '$' + v.toFixed(2)
}

interface CellEvent {
  ticker: string
  name: string
  color: string
  type: 'ex' | 'pay'
  dps: number
  quantity: number
  currency: string
  accountType: AccountType
}

interface TableRow extends CellEvent {
  date: string
}

function calcAmounts(
  row: Pick<TableRow, 'dps' | 'quantity' | 'currency' | 'accountType'>,
  fxRate: number,
) {
  const gross = row.dps * row.quantity
  const rate = dividendTaxRate(row.accountType, row.currency)
  const net = gross * (1 - rate)
  const toKrw = row.currency === 'USD' ? fxRate : 1
  const toUsd = row.currency === 'USD' ? 1 : 1 / fxRate
  return {
    grossKrw: gross * toKrw, netKrw: net * toKrw,
    grossUsd: gross * toUsd, netUsd: net * toUsd,
  }
}

export default function DividendCalendarView() {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [events, setEvents] = useState<DividendEvent[]>([])
  const [holdings, setHoldings] = useState<StoredPosition[]>([])
  const [fxRate, setFxRate] = useState(1300)
  const [stockNames, setStockNames] = useState<Record<string, string>>({})
  const [showAfterTax, setShowAfterTax] = useState(false)
  const [showUsd, setShowUsd] = useState(false)
  const [popupDate, setPopupDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const held = getHoldings()
    setHoldings(held)
    if (held.length === 0) { setLoading(false); return }

    const heldTickers = [...new Set(held.map(h => h.ticker))]

    Promise.all([
      Promise.all(held.map(h => fetchCalendar(h.ticker, h.market).catch(() => [] as DividendEvent[]))),
      fetchFxRate().catch(() => ({ usdkrw: 1300, asOf: '' })),
      Promise.all(heldTickers.map(t => fetchStock(t).catch(() => null))),
    ]).then(([calResults, fx, quotes]) => {
      setEvents(calResults.flat())
      setFxRate(fx.usdkrw)
      const names: Record<string, string> = {}
      quotes.forEach(q => { if (q) names[q.ticker] = q.name })
      setStockNames(names)
    }).catch(() => setError('데이터를 불러오지 못했습니다'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!popupDate) return
    function handler(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopupDate(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [popupDate])

  const tickerList = useMemo(
    () => [...new Set(holdings.map(h => h.ticker))],
    [holdings],
  )
  const colorMap = useMemo(
    () => Object.fromEntries(tickerList.map((t, i) => [t, TICKER_COLORS[i % TICKER_COLORS.length]])),
    [tickerList],
  )
  const holdingMap = useMemo(() => {
    const m = new Map<string, StoredPosition>()
    holdings.forEach(h => m.set(h.ticker, h))
    return m
  }, [holdings])

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`

  const dayEventsMap = useMemo(() => {
    const map: Record<string, CellEvent[]> = {}
    const push = (date: string, ev: CellEvent) => {
      if (!map[date]) map[date] = []
      if (!map[date].some(e => e.ticker === ev.ticker && e.type === ev.type)) {
        map[date].push(ev)
      }
    }
    events.forEach(ev => {
      const h = holdingMap.get(ev.ticker)
      if (!h) return
      const base: Omit<CellEvent, 'type'> = {
        ticker: ev.ticker,
        name: stockNames[ev.ticker] ?? ev.ticker,
        color: colorMap[ev.ticker] ?? '#888',
        dps: ev.dps,
        quantity: h.quantity,
        currency: ev.currency,
        accountType: h.accountType,
      }
      push(ev.exDate, { ...base, type: 'ex' })
      push(ev.paymentDate ?? ev.exDate, { ...base, type: 'pay' })
    })
    return map
  }, [events, holdingMap, colorMap, stockNames])

  const calendarDays = useMemo(() => {
    const firstDow = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (number | null)[] = Array(firstDow).fill(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(d)
    while (days.length % 7 !== 0) days.push(null)
    return days
  }, [year, month])

  const tableRows = useMemo((): TableRow[] => {
    const rows: TableRow[] = []
    events.forEach(ev => {
      const h = holdingMap.get(ev.ticker)
      if (!h) return
      const base = {
        ticker: ev.ticker,
        name: stockNames[ev.ticker] ?? ev.ticker,
        color: colorMap[ev.ticker] ?? '#888',
        dps: ev.dps,
        quantity: h.quantity,
        currency: ev.currency,
        accountType: h.accountType,
      }
      const payDate = ev.paymentDate ?? ev.exDate
      if (ev.exDate.startsWith(monthStr)) rows.push({ ...base, type: 'ex', date: ev.exDate })
      if (payDate.startsWith(monthStr)) rows.push({ ...base, type: 'pay', date: payDate })
    })
    return rows.sort((a, b) => a.date.localeCompare(b.date))
  }, [events, holdingMap, colorMap, stockNames, monthStr])

  const tableTotal = useMemo(
    () => tableRows.reduce((acc, row) => {
      const a = calcAmounts(row, fxRate)
      return {
        grossKrw: acc.grossKrw + a.grossKrw,
        netKrw: acc.netKrw + a.netKrw,
        grossUsd: acc.grossUsd + a.grossUsd,
        netUsd: acc.netUsd + a.netUsd,
      }
    }, { grossKrw: 0, netKrw: 0, grossUsd: 0, netUsd: 0 }),
    [tableRows, fxRate],
  )

  function prevMonth() {
    setPopupDate(null)
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    setPopupDate(null)
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-slate-500">
      캘린더 로딩 중...
    </div>
  )
  if (error) return <div className="text-center py-12 text-red-500">{error}</div>
  if (holdings.length === 0) return (
    <div className="text-center py-12 text-slate-500">
      보유 종목이 없습니다.{' '}
      <a href="/holdings">보유종목 관리</a>에서 먼저 종목을 추가하세요.
    </div>
  )

  const popupEvents = popupDate ? (dayEventsMap[popupDate] ?? []) : []

  return (
    <div className="space-y-5">
      {/* ── Header: navigation + toggles ── */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm text-lg font-light"
          >
            ‹
          </button>
          <h2 className="text-xl font-bold text-slate-800 w-32 text-center">
            {year}년 {month + 1}월
          </h2>
          <button
            onClick={nextMonth}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm text-lg font-light"
          >
            ›
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAfterTax(v => !v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              showAfterTax
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {showAfterTax ? '세후' : '세전'}
          </button>
          <button
            onClick={() => setShowUsd(v => !v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              showUsd
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {showUsd ? 'USD' : 'KRW'}
          </button>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
        <span className="text-xs text-slate-400 font-medium">종목</span>
        {tickerList.map(ticker => (
          <div key={ticker} className="flex items-center gap-1.5 text-sm">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: colorMap[ticker] }} />
            <span className="font-medium text-slate-700">{ticker}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-400" />
            배당락일
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-slate-400" />
            지급일
          </span>
        </div>
      </div>

      {/* ── Calendar grid ── */}
      <div className="relative bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Weekday header */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {WEEKDAYS.map((d, i) => (
            <div
              key={d}
              className={`py-2.5 text-center text-xs font-semibold ${
                i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-500'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const col = idx % 7
            const borderR = col !== 6 ? 'border-r' : ''
            if (day === null) {
              return (
                <div
                  key={`e-${idx}`}
                  className={`h-[4.5rem] bg-slate-50/40 border-b border-slate-100 ${borderR} border-slate-100`}
                />
              )
            }
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const cellEvs = dayEventsMap[dateStr] ?? []
            const isToday = dateStr === todayStr
            const isSelected = dateStr === popupDate
            return (
              <div
                key={dateStr}
                onClick={() => cellEvs.length > 0 && setPopupDate(isSelected ? null : dateStr)}
                className={[
                  'h-[4.5rem] border-b border-slate-100 p-1.5 flex flex-col',
                  borderR && `${borderR} border-slate-100`,
                  cellEvs.length > 0 ? 'cursor-pointer hover:bg-blue-50/60' : '',
                  isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-300' : '',
                ].filter(Boolean).join(' ')}
              >
                <div>
                  {isToday ? (
                    <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-bold">
                      {day}
                    </span>
                  ) : (
                    <span className={`text-xs font-medium ${col === 0 ? 'text-red-400' : col === 6 ? 'text-blue-400' : 'text-slate-600'}`}>
                      {day}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-0.5 mt-1">
                  {cellEvs.map((ev, i) => (
                    <span
                      key={i}
                      title={`${ev.ticker} ${ev.type === 'ex' ? '배당락일' : '지급일'}`}
                      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        background: ev.type === 'ex' ? ev.color : 'transparent',
                        border: `2px solid ${ev.color}`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Popup overlay ── */}
        {popupDate && popupEvents.length > 0 && (
          <div
            className="absolute inset-0 bg-black/20 flex items-center justify-center z-20 p-4"
            onClick={() => setPopupDate(null)}
          >
            <div
              ref={popupRef}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-xs"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="font-semibold text-slate-700 text-sm">{popupDate}</span>
                <button
                  onClick={() => setPopupDate(null)}
                  className="text-slate-400 hover:text-slate-600 text-xl leading-none w-6 h-6 flex items-center justify-center"
                >
                  ×
                </button>
              </div>
              <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
                {popupEvents.map((ev, i) => {
                  const gross = ev.dps * ev.quantity
                  const rate = dividendTaxRate(ev.accountType, ev.currency)
                  const net = gross * (1 - rate)
                  const toKrw = ev.currency === 'USD' ? fxRate : 1
                  const toUsd = ev.currency === 'USD' ? 1 : 1 / fxRate
                  const fmt = showUsd ? fmtUSD : fmtKRW
                  const grossAmt = showUsd ? gross * toUsd : gross * toKrw
                  const netAmt = showUsd ? net * toUsd : net * toKrw
                  return (
                    <div key={i} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ev.color }} />
                        <span className="font-semibold text-sm text-slate-800">{ev.ticker}</span>
                        {ev.name !== ev.ticker && (
                          <span className="text-xs text-slate-400 truncate flex-1">{ev.name}</span>
                        )}
                        <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                          ev.type === 'ex'
                            ? 'bg-orange-100 text-orange-600'
                            : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          {ev.type === 'ex' ? '배당락일' : '지급일'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mb-2">
                        DPS {ev.currency === 'USD' ? '$' : '₩'}{ev.dps.toFixed(4)} × {ev.quantity.toLocaleString()}주
                      </div>
                      <div className="grid grid-cols-2 gap-y-1 text-sm">
                        <span className="text-slate-500">세전</span>
                        <span className="text-right font-semibold text-slate-800">{fmt(grossAmt)}</span>
                        <span className="text-slate-500">세후</span>
                        <span className="text-right font-semibold text-blue-600">{fmt(netAmt)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Monthly summary table ── */}
      {tableRows.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-slate-700">
              {year}년 {month + 1}월 배당 요약
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-2.5 font-medium text-slate-500">종목</th>
                  <th className="px-4 py-2.5 font-medium text-slate-500">구분</th>
                  <th className="px-4 py-2.5 font-medium text-slate-500">날짜</th>
                  <th className="px-4 py-2.5 font-medium text-slate-500 text-right">
                    {showAfterTax ? '세후' : '세전'} ({showUsd ? 'USD' : 'KRW'})
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tableRows.map((row, i) => {
                  const a = calcAmounts(row, fxRate)
                  const amount = showAfterTax
                    ? (showUsd ? a.netUsd : a.netKrw)
                    : (showUsd ? a.grossUsd : a.grossKrw)
                  return (
                    <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: row.color }} />
                          <span className="font-medium text-slate-800">{row.ticker}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                          row.type === 'ex'
                            ? 'bg-orange-100 text-orange-600'
                            : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          {row.type === 'ex' ? '배당락일' : '지급일'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{row.date}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">
                        {showUsd ? fmtUSD(amount) : fmtKRW(amount)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td colSpan={3} className="px-4 py-3 font-semibold text-slate-700">합계</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-600 text-base">
                    {showUsd
                      ? fmtUSD(showAfterTax ? tableTotal.netUsd : tableTotal.grossUsd)
                      : fmtKRW(showAfterTax ? tableTotal.netKrw : tableTotal.grossKrw)
                    }
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-slate-200 shadow-sm">
          {year}년 {month + 1}월 배당 일정이 없습니다.
        </div>
      )}
    </div>
  )
}
