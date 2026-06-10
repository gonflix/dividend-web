import type { IncomingMessage, ServerResponse } from 'node:http'
import { fetchStockQuote } from '../_lib/yahoo.js'
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
    const quote = await fetchStockQuote(ticker)
    res.end(JSON.stringify(quote))
  } catch (err) {
    res.statusCode = 502
    res.end(JSON.stringify({ error: String(err) }))
  }
}
