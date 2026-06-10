import type { IncomingMessage, ServerResponse } from 'node:http'
import { fetchUsdKrw } from '../_lib/yahoo.js'
import { setCacheHeaders } from '../_lib/cache.js'

export default async function handler(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    setCacheHeaders(res)
    res.setHeader('Content-Type', 'application/json')
    const rate = await fetchUsdKrw()
    res.end(JSON.stringify(rate))
  } catch (err) {
    res.statusCode = 502
    res.end(JSON.stringify({ error: String(err) }))
  }
}
