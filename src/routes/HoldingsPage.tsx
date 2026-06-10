import { useState, useEffect } from 'react'
import HoldingsTable from '../components/HoldingsTable.js'
import HoldingForm from '../components/HoldingForm.js'
import { getHoldings } from '../store/holdingsStore.js'
import type { StoredPosition } from '../store/holdingsStore.js'

export default function HoldingsPage() {
  const [positions, setPositions] = useState<StoredPosition[]>([])

  function refresh() {
    setPositions(getHoldings())
  }

  useEffect(() => { refresh() }, [])

  return (
    <div>
      <h1>보유종목 관리</h1>
      <HoldingsTable positions={positions} onRefresh={refresh} />
      <hr />
      <h2>종목 추가</h2>
      <HoldingForm onAdded={refresh} />
    </div>
  )
}
