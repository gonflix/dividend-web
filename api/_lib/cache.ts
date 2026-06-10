import type { ServerResponse } from 'node:http'

/** Emit CDN edge caching headers — daily TTL, no KV/Redis needed. */
export function setCacheHeaders(res: ServerResponse): void {
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=43200')
}
