import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import CalendarPage from './routes/CalendarPage'
import HoldingsPage from './routes/HoldingsPage'
import ScenarioPage from './routes/ScenarioPage'

export default function App() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <nav style={{ background: '#1e293b', padding: '12px 24px', display: 'flex', gap: 24 }}>
        <NavLink to="/holdings" style={({ isActive }) => ({ color: isActive ? '#60a5fa' : '#94a3b8' })}>보유종목</NavLink>
        <NavLink to="/calendar" style={({ isActive }) => ({ color: isActive ? '#60a5fa' : '#94a3b8' })}>캘린더</NavLink>
        <NavLink to="/scenario" style={({ isActive }) => ({ color: isActive ? '#60a5fa' : '#94a3b8' })}>시나리오</NavLink>
      </nav>
      <main style={{ padding: '24px' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/holdings" replace />} />
          <Route path="/explorer" element={<Navigate to="/holdings" replace />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/holdings" element={<HoldingsPage />} />
          <Route path="/scenario" element={<ScenarioPage />} />
        </Routes>
      </main>
    </div>
  )
}
