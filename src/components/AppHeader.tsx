import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { fetchFxRate } from '../api/client.js'

const TABS = [
  { path: '/holdings', label: '보유종목' },
  { path: '/calendar', label: '캘린더' },
  { path: '/scenario', label: '시나리오' },
]

export default function AppHeader() {
  const [fxRate, setFxRate] = useState<number | null>(null)

  const today = new Date()
  const dateStr = today.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  useEffect(() => {
    fetchFxRate().then(r => setFxRate(r.usdkrw)).catch(() => {})
  }, [])

  return (
    <header className="bg-slate-900 shadow-xl">
      <div className="max-w-7xl mx-auto px-6">
        {/* 제목 + 날짜/환율 */}
        <div className="flex items-center justify-between py-4 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">DI</span>
            </div>
            <span className="text-lg font-bold text-white tracking-wide">
              Dividend Investment
            </span>
          </div>
          <div className="flex items-center gap-5 text-sm">
            <span className="text-slate-400">{dateStr}</span>
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5 border border-slate-700">
              <span className="text-slate-500 text-xs font-medium">USD/KRW</span>
              <span className="text-white font-semibold">
                {fxRate
                  ? fxRate.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
                  : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* 탭 */}
        <nav className="flex gap-0">
          {TABS.map(tab => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `px-5 py-3 text-sm font-medium border-b-2 transition-all ${
                  isActive
                    ? 'border-blue-400 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
