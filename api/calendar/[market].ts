import type { IncomingMessage, ServerResponse } from 'node:http'
import { fetchUsDividendDates } from '../_lib/yahoo.js'
import { fetchKrxDividendDates } from '../_lib/krx.js'
import { setCacheHeaders } from '../_lib/cache.js'

export default async function handler(req: IncomingMessage & { query?: Record<string, string> }, res: ServerResponse): Promise<void> {
  const market = (req as { query?: Record<string, string> }).query?.market?.toUpperCase() ?? ''
  const ticker = (req as { query?: Record<string, string> }).query?.ticker ?? ''
  if (!ticker) {
    res.statusCode = 400
    res.end(JSON.stringify({ error: 'ticker required' }))
    return
  }
  try {
    setCacheHeaders(res)
    res.setHeader('Content-Type', 'application/json')
    const events = market === 'KR'
      ? await fetchKrxDividendDates(ticker)
      : await fetchUsDividendDates(ticker)
    res.end(JSON.stringify(events))
  } catch (err) {
    res.statusCode = 502
    res.end(JSON.stringify({ error: String(err) }))
  }
}
