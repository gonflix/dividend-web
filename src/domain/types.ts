export type Market = 'KR' | 'US'
export type AccountType = 'ISA' | 'PENSION' | 'GENERAL'
export type ProjectionModel = 'optimistic' | 'base' | 'pessimistic'
/** ISA sub-type: 일반형 vs 서민형/농어민형 (different 비과세 profit thresholds). */
export type IsaType = 'GENERAL_TYPE' | 'PREFERENCE_TYPE'

export interface Position {
  ticker: string
  market: Market
  quantity: number
  costBasis: number     // KRW per share (purchase price)
  accountType: AccountType
  isaType?: IsaType
}
