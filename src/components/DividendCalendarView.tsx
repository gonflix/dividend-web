import { useState, useEffect } from 'react'
import type { DividendEvent } from '../api/client.js'
import { fetchCalendar } from '../api/client.js'
import { getHoldings } from '../store/holdingsStore.js'

export default function DividendCalendarView() {
  const [events, setEvents] = useState<DividendEvent[]>([])
  const [hasHoldings, setHasHoldings] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const holdings = getHoldings()
    if (holdings.length === 0) {
      setHasHoldings(false)
      setLoading(false)
      return
    }
    const heldTickers = new Set(holdings.map((h) => h.ticker))
    const markets = [...new Set(holdings.map((h) => h.market))] as ('KR' | 'US')[]

    Promise.all(markets.map((m) => fetchCalendar(m).catch(() => [] as DividendEvent[])))
      .then((results) => {
        const all = results.flat().filter((ev) => heldTickers.has(ev.ticker))
        all.sort((a, b) => a.exDate.localeCompare(b.exDate))
        setEvents(all)
      })
      .catch(() => setError('캘린더 데이터를 불러오지 못했습니다'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>캘린더 로딩 중…</p>
  if (error) return <p style={{ color: 'red' }}>{error}</p>
  if (!hasHoldings) return <p>보유 종목이 없습니다. <a href="/holdings">보유종목 관리</a>에서 먼저 종목을 추가하세요.</p>
  if (events.length === 0) return <p>KR dividend dates unavailable — 보유 종목의 배당 일정이 없습니다.</p>

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th>티커</th>
          <th>배당락일</th>
          <th>지급일</th>
          <th>DPS</th>
          <th>통화</th>
        </tr>
      </thead>
      <tbody>
        {events.map((ev) => (
          <tr key={ev.ticker + ev.exDate}>
            <td>{ev.ticker}</td>
            <td>{ev.exDate}</td>
            <td>{ev.paymentDate}</td>
            <td>{ev.dps}</td>
            <td>{ev.currency}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
