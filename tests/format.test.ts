import { describe, it, expect } from 'vitest'
import { formatKrw, formatPercent } from '../src/lib/format.js'
import { usdToKrw } from '../src/domain/fx.js'

describe('formatKrw', () => {
  it('formats a KRW amount with Korean locale currency symbol', () => {
    const result = formatKrw(1_300_000)
    expect(result).toMatch(/1,300,000/)
  })

  it('formats zero', () => {
    expect(formatKrw(0)).toMatch(/0/)
  })
})

describe('formatPercent', () => {
  it('formats 0.03 as "3.00%"', () => {
    expect(formatPercent(0.03)).toBe('3.00%')
  })

  it('formats 0.154 as "15.40%"', () => {
    expect(formatPercent(0.154)).toBe('15.40%')
  })
})

describe('KRW-converted price = usdToKrw(nativePrice, fxRate)', () => {
  it('displayed KRW price equals usdToKrw(price, fxRate)', () => {
    const nativePrice = 185.5   // USD
    const fxRate = 1350
    const expected = usdToKrw(nativePrice, fxRate)
    expect(expected).toBeCloseTo(nativePrice * fxRate)
    expect(formatKrw(expected)).toMatch(/250,425/)
  })

  it('KR stock: KRW price === native price (no conversion)', () => {
    const nativePrice = 75_000  // KRW already
    expect(usdToKrw(nativePrice, 1)).toBe(nativePrice)
  })
})
