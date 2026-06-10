import { describe, it, expect } from 'vitest'
import { normalizeChart, normalizeFx, extractDividends, type YahooChartResponse } from '../api/_lib/yahoo.js'
import { normalizeKrxData, type KrxResponse } from '../api/_lib/krx.js'

// ---------------------------------------------------------------------------
// Fixtures — no live network calls
// ---------------------------------------------------------------------------

const yahooAaplFixture: YahooChartResponse = {
  chart: {
    result: [
      {
        meta: {
          symbol: 'AAPL',
          longName: 'Apple Inc.',
          currency: 'USD',
          regularMarketPrice: 189.3,
          regularMarketTime: 1717200000,
          trailingAnnualDividendYield: 0.0053,
        },
        events: {
          dividends: {
            '1715040000': { amount: 0.25, date: 1715040000 },
            '1706832000': { amount: 0.24, date: 1706832000 },
          },
        },
      },
    ],
  },
}

const yahooFxFixture: YahooChartResponse = {
  chart: {
    result: [
      {
        meta: {
          symbol: 'USDKRW=X',
          currency: 'KRW',
          regularMarketPrice: 1380.5,
          regularMarketTime: 1717200000,
        },
      },
    ],
  },
}

const krxSuccessFixture: KrxResponse = {
  OutBlock_1: [
    { RECORD_DATE: '20240315', PAY_DATE: '20240410', DPS: '500' },
    { RECORD_DATE: '20230915', PAY_DATE: '20231010', DPS: '480' },
  ],
}

const krxUnavailableFixture: KrxResponse = {}

const krxEmptyFixture: KrxResponse = { OutBlock_1: [] }

// ---------------------------------------------------------------------------
// StockQuote DTO shape from Yahoo fixture
// ---------------------------------------------------------------------------

describe('normalizeChart', () => {
  it('returns a StockQuote with correct DTO shape', () => {
    const result = normalizeChart('AAPL', yahooAaplFixture)
    expect(result.ticker).toBe('AAPL')
    expect(result.market).toBe('US')
    expect(result.name).toBe('Apple Inc.')
    expect(result.price).toBe(189.3)
    expect(result.currency).toBe('USD')
    expect(typeof result.annualDividendYield).toBe('number')
    expect(typeof result.asOf).toBe('string')
    expect(Array.isArray(result.dividendEvents)).toBe(true)
  })

  it('extracts dividend events from chart response', () => {
    const result = normalizeChart('AAPL', yahooAaplFixture)
    expect(result.dividendEvents).toHaveLength(2)
    const event = result.dividendEvents[0]
    expect(event).toHaveProperty('ticker', 'AAPL')
    expect(event).toHaveProperty('exDate')
    expect(event).toHaveProperty('dps')
    expect(event.dps).toBeGreaterThan(0)
    expect(event.currency).toBe('USD')
  })

  it('throws when no result in response', () => {
    expect(() => normalizeChart('AAPL', { chart: { result: [] } })).toThrow()
    expect(() => normalizeChart('AAPL', {})).toThrow()
  })
})

// ---------------------------------------------------------------------------
// FxRate DTO shape from Yahoo fixture
// ---------------------------------------------------------------------------

describe('normalizeFx', () => {
  it('returns FxRate with usdkrw and asOf', () => {
    const result = normalizeFx(yahooFxFixture)
    expect(result.usdkrw).toBe(1380.5)
    expect(typeof result.asOf).toBe('string')
    expect(result.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('throws on empty or malformed response', () => {
    expect(() => normalizeFx({})).toThrow()
    expect(() => normalizeFx({ chart: { result: [] } })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// DividendEvent[] from KRX success fixture
// ---------------------------------------------------------------------------

describe('normalizeKrxData — success fixture', () => {
  it('returns DividendEvent[] with correct shape', () => {
    const result = normalizeKrxData('005930', krxSuccessFixture)
    expect(result).toHaveLength(2)
    const event = result[0]
    expect(event.ticker).toBe('005930')
    expect(event.exDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(event.currency).toBe('KRW')
    expect(event.dps).toBeGreaterThan(0)
  })

  it('parses ex-date and payment-date correctly', () => {
    const result = normalizeKrxData('005930', krxSuccessFixture)
    expect(result[0].exDate).toBe('2024-03-15')
    expect(result[0].paymentDate).toBe('2024-04-10')
  })
})

// ---------------------------------------------------------------------------
// KRX-unavailable fixture returns empty array (graceful degradation)
// ---------------------------------------------------------------------------

describe('normalizeKrxData — unavailable/empty fixtures', () => {
  it('returns [] when OutBlock_1 is missing (unavailable)', () => {
    expect(normalizeKrxData('005930', krxUnavailableFixture)).toEqual([])
  })

  it('returns [] when OutBlock_1 is empty array', () => {
    expect(normalizeKrxData('005930', krxEmptyFixture)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// extractDividends handles missing events gracefully
// ---------------------------------------------------------------------------

describe('extractDividends', () => {
  it('returns [] when no dividend events in chart response', () => {
    const fixture: YahooChartResponse = {
      chart: {
        result: [{ meta: { symbol: 'NOSPLIT', currency: 'USD', regularMarketPrice: 10 } }],
      },
    }
    expect(extractDividends('NOSPLIT', fixture)).toEqual([])
  })
})
