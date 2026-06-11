import type { IncomingMessage, ServerResponse } from 'node:http'
import { fetchUsDividendDates } from '../_lib/yahoo.js'
import { setCacheHeaders } from '../_lib/cache.js'

export default async function handler(req: IncomingMessage & { query?: Record<string, string> }, res: ServerResponse): Promise<void> {
  const ticker = (req as { query?: Record<string, string> }).query?.ticker ?? ''
  if (!ticker) {
    res.statusCode = 400
    res.end(JSON.stringify({ error: 'ticker required' }))
    return
  }
  try {
    setCacheHeaders(res)
    res.setHeader('Content-Type', 'application/json')
    // Yahoo Finance supports both US and KR (.KS/.KQ) tickers
    const events = await fetchUsDividendDates(ticker)
    res.end(JSON.stringify(events))
  } catch (err) {
    res.statusCode = 502
    res.end(JSON.stringify({ error: String(err) }))
  }
}
