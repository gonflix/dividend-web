const krwFormatter = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 })

export function formatKrw(amount: number): string {
  return krwFormatter.format(amount)
}

export function formatPercent(rate: number): string {
  return (rate * 100).toFixed(2) + '%'
}
