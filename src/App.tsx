import { Routes, Route, Navigate } from 'react-router-dom'
import AppHeader from './components/AppHeader.js'
import CalendarPage from './routes/CalendarPage'
import HoldingsPage from './routes/HoldingsPage'
import ScenarioPage from './routes/ScenarioPage'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="max-w-7xl mx-auto px-6 py-8">
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
