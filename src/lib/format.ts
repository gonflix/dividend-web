const krwFormatter = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 })

export function formatKrw(amount: number): string {
  return krwFormatter.format(amount)
}

export function formatPercent(rate: number): string {
  return (rate * 100).toFixed(2) + '%'
}

export function formatAmount(amount: number, currency: 'KRW' | 'USD'): string {
  if (currency === 'KRW') return formatKrw(amount)
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
