import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import ScenarioForm from '../components/ScenarioForm.js'
import ProjectionChart from '../components/ProjectionChart.js'
import AccountComparisonTable from '../components/AccountComparisonTable.js'
import { project } from '../domain/projection.js'
import type { ScenarioParams } from '../components/ScenarioForm.js'

const DEFAULT_PARAMS: ScenarioParams = {
  ticker: '',
  market: 'US',
  monthlyDca: 500_000,
  years: 10,
  annualYield: 0.04,
  model: 'base',
  accountType: 'GENERAL',
  isaType: 'GENERAL_TYPE',
  ageAtWithdrawal: 55,
}

export default function ScenarioPage() {
  const [searchParams] = useSearchParams()
  const prefillTicker = searchParams.get('ticker') ?? ''

  const [params, setParams] = useState<ScenarioParams>({
    ...DEFAULT_PARAMS,
    ticker: prefillTicker.toUpperCase(),
  })

  const { series } = useMemo(
    () =>
      project({
        monthlyDca: params.monthlyDca,
        years: params.years,
        model: params.model,
        annualDividendYield: params.annualYield,
        market: params.market,
        accountType: params.accountType,
        isaType: params.isaType,
        ageAtWithdrawal: params.ageAtWithdrawal,
      }),
    [params]
  )

  return (
    <div>
      <h1>시나리오 시뮬레이터</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>
        <ScenarioForm params={params} onChange={setParams} />
        <div>
          <h2>월별 배당 수입 (세후)</h2>
          <ProjectionChart series={series} years={params.years} />
          <h2 style={{ marginTop: 24 }}>계좌별 세후 비교</h2>
          <AccountComparisonTable params={params} />
        </div>
      </div>
    </div>
  )
}
