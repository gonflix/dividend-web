import { project } from '../domain/projection.js'
import { formatKrw } from '../lib/format.js'
import type { AccountType } from '../domain/types.js'
import type { ScenarioParams } from './ScenarioForm.js'

interface Props {
  params: ScenarioParams
}

const ROWS: { accountType: AccountType; label: string }[] = [
  { accountType: 'ISA', label: 'ISA' },
  { accountType: 'PENSION', label: '연금저축' },
  { accountType: 'GENERAL', label: '일반' },
]

export default function AccountComparisonTable({ params }: Props) {
  const results = ROWS.map(({ accountType, label }) => {
    const { headlineTotal, preTaxTotal } = project({
      monthlyDca: params.monthlyDca,
      years: params.years,
      model: params.model,
      annualDividendYield: params.annualYield,
      market: params.market,
      accountType,
      isaType: params.isaType,
      ageAtWithdrawal: params.ageAtWithdrawal,
    })
    return { accountType, label, headlineTotal, preTaxTotal }
  })

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: '6px 8px' }}>계좌 종류</th>
          <th style={{ textAlign: 'right', padding: '6px 8px' }}>세후 배당 합계</th>
          <th style={{ textAlign: 'right', padding: '6px 8px' }}>세전 대비</th>
          <th style={{ textAlign: 'left', padding: '6px 8px' }}>비고</th>
        </tr>
      </thead>
      <tbody>
        {results.map(({ accountType, label, headlineTotal, preTaxTotal }) => (
          <tr key={accountType} style={{ borderTop: '1px solid #e5e7eb' }}>
            <td style={{ padding: '6px 8px' }}>{label}</td>
            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{formatKrw(headlineTotal)}</td>
            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#6b7280', fontSize: '0.85em' }}>
              {preTaxTotal > 0 ? `${((headlineTotal / preTaxTotal) * 100).toFixed(1)}%` : '-'}
            </td>
            <td style={{ padding: '6px 8px', fontSize: '0.8em', color: '#6b7280' }}>
              {accountType === 'PENSION'
                ? '※ 세액공제 효과(최대 16.5%) 미반영 — 실제 수익률 더 높을 수 있음'
                : ''}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
