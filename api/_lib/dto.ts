export interface DividendEvent {
  ticker: string
  exDate: string        // ISO date string YYYY-MM-DD
  paymentDate: string | null
  dps: number           // dividend per share in native currency
  currency: string
}

export interface StockQuote {
  ticker: string
  market: 'KR' | 'US'
  name: string
  price: number         // current price in native currency
  currency: string
  annualDividendYield: number  // decimal (e.g. 0.015 = 1.5%)
  dividendEvents: DividendEvent[]
  asOf: string          // ISO date string
}

export interface FxRate {
  usdkrw: number
  asOf: string
}
