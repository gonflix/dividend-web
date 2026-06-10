import { describe, it, expect } from 'vitest'
import { usdToKrw } from '../src/domain/fx.js'

describe('usdToKrw', () => {
  it('usdToKrw(1, 1300) === 1300', () => {
    expect(usdToKrw(1, 1300)).toBe(1300)
  })

  it('usdToKrw(0, 1300) === 0', () => {
    expect(usdToKrw(0, 1300)).toBe(0)
  })

  it('usdToKrw(10.5, 1400) === 14700', () => {
    expect(usdToKrw(10.5, 1400)).toBeCloseTo(14700)
  })

  it('linear scaling: usdToKrw(2, rate) === 2 * usdToKrw(1, rate)', () => {
    const rate = 1350
    expect(usdToKrw(2, rate)).toBeCloseTo(2 * usdToKrw(1, rate))
  })
})
