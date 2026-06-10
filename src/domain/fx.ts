/** Convert USD amount to KRW. All tax functions expect gross in KRW. */
export function usdToKrw(amountUsd: number, rate: number): number {
  return amountUsd * rate
}
