import { Routes, Route, NavLink } from 'react-router-dom'
import ExplorerPage from './routes/ExplorerPage'
import CalendarPage from './routes/CalendarPage'
import HoldingsPage from './routes/HoldingsPage'
import ScenarioPage from './routes/ScenarioPage'

export default function App() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <nav style={{ background: '#1e293b', padding: '12px 24px', display: 'flex', gap: 24 }}>
        <NavLink to="/explorer" style={({ isActive }) => ({ color: isActive ? '#60a5fa' : '#94a3b8' })}>탐색</NavLink>
        <NavLink to="/calendar" style={({ isActive }) => ({ color: isActive ? '#60a5fa' : '#94a3b8' })}>캘린더</NavLink>
        <NavLink to="/holdings" style={({ isActive }) => ({ color: isActive ? '#60a5fa' : '#94a3b8' })}>보유종목</NavLink>
        <NavLink to="/scenario" style={({ isActive }) => ({ color: isActive ? '#60a5fa' : '#94a3b8' })}>시나리오</NavLink>
      </nav>
      <main style={{ padding: '24px' }}>
        <Routes>
          <Route path="/" element={<ExplorerPage />} />
          <Route path="/explorer" element={<ExplorerPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/holdings" element={<HoldingsPage />} />
          <Route path="/scenario" element={<ScenarioPage />} />
        </Routes>
      </main>
    </div>
  )
}
