import type { StoredPosition } from '../store/holdingsStore.js'
import { deleteHolding } from '../store/holdingsStore.js'

const ACCOUNT_LABEL: Record<string, string> = {
  ISA: 'ISA',
  PENSION: '연금저축',
  GENERAL: '일반',
}

interface Props {
  positions: StoredPosition[]
  onRefresh: () => void
}

export default function HoldingsTable({ positions, onRefresh }: Props) {
  if (positions.length === 0) {
    return <p style={{ color: '#888' }}>보유 종목이 없습니다. 아래 폼에서 추가하세요.</p>
  }

  function handleDelete(id: string) {
    deleteHolding(id)
    onRefresh()
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th>티커</th>
          <th>시장</th>
          <th>수량</th>
          <th>평균단가 (KRW)</th>
          <th>계좌</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {positions.map((p) => (
          <tr key={p.id}>
            <td>{p.ticker}</td>
            <td>{p.market}</td>
            <td>{p.quantity.toLocaleString('ko-KR')}</td>
            <td>{p.costBasis.toLocaleString('ko-KR')}</td>
            <td>{ACCOUNT_LABEL[p.accountType] ?? p.accountType}</td>
            <td>
              <button onClick={() => handleDelete(p.id)}>삭제</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
