import type { AccountType, IsaType, Market, ProjectionModel } from '../domain/types.js'

export interface ScenarioParams {
  ticker: string
  market: Market
  monthlyDca: number
  years: number
  annualYield: number       // decimal (e.g. 0.04 = 4%)
  model: ProjectionModel
  accountType: AccountType
  isaType: IsaType
  ageAtWithdrawal: number
}

interface Props {
  params: ScenarioParams
  onChange: (params: ScenarioParams) => void
}

export default function ScenarioForm({ params, onChange }: Props) {
  function update(patch: Partial<ScenarioParams>) {
    onChange({ ...params, ...patch })
  }

  return (
    <form style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 420 }} onSubmit={(e) => e.preventDefault()}>
      <label>
        티커
        <input
          value={params.ticker}
          onChange={(e) => update({ ticker: e.target.value.toUpperCase() })}
          placeholder="예: AAPL, 005930"
        />
      </label>

      <label>
        시장
        <select value={params.market} onChange={(e) => update({ market: e.target.value as Market })}>
          <option value="KR">KR (국내)</option>
          <option value="US">US (미국)</option>
        </select>
      </label>

      <label>
        월 적립금 (KRW)
        <input
          type="number"
          value={params.monthlyDca}
          min={0}
          step={10000}
          onChange={(e) => update({ monthlyDca: parseFloat(e.target.value) || 0 })}
        />
      </label>

      <label>
        투자 기간 (년)
        <input
          type="number"
          value={params.years}
          min={1}
          max={50}
          onChange={(e) => update({ years: parseInt(e.target.value) || 1 })}
        />
      </label>

      <label>
        예상 연간 배당수익률 (%)
        <input
          type="number"
          value={(params.annualYield * 100).toFixed(2)}
          min={0}
          max={100}
          step={0.1}
          onChange={(e) => update({ annualYield: (parseFloat(e.target.value) || 0) / 100 })}
        />
      </label>

      <label>
        계좌 종류
        <select value={params.accountType} onChange={(e) => update({ accountType: e.target.value as AccountType })}>
          <option value="ISA">ISA</option>
          <option value="PENSION">연금저축</option>
          <option value="GENERAL">일반</option>
        </select>
      </label>

      {params.accountType === 'ISA' && (
        <label>
          ISA 종류
          <select value={params.isaType} onChange={(e) => update({ isaType: e.target.value as IsaType })}>
            <option value="GENERAL_TYPE">일반형 (비과세 200만원)</option>
            <option value="PREFERENCE_TYPE">서민형 (비과세 400만원)</option>
          </select>
        </label>
      )}

      {params.accountType === 'PENSION' && (
        <label>
          인출 시 나이 (세)
          <input
            type="number"
            value={params.ageAtWithdrawal}
            min={55}
            max={100}
            onChange={(e) => update({ ageAtWithdrawal: parseInt(e.target.value) || 55 })}
          />
        </label>
      )}

      <label>
        수익률 모델
        <select value={params.model} onChange={(e) => update({ model: e.target.value as ProjectionModel })}>
          <option value="optimistic">낙관 (+6% 성장)</option>
          <option value="base">기본 (+3% 성장)</option>
          <option value="pessimistic">보수 (성장 없음)</option>
        </select>
      </label>
    </form>
  )
}
