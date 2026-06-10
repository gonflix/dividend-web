import type { DividendEvent } from './dto.js'

const KRX_URL = 'https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd'

/**
 * Fetch KR dividend dates from the KRX 정보데이터시스템 JSON portal.
 * Source: POST data.krx.co.kr/comm/bldAttendant/getJsonData.cmd
 * Status: undocumented, ToS-gray — all KRX quirks isolated here.
 * On ANY failure: returns [] for graceful degradation (never throws).
 */
export async function fetchKrxDividendDates(ticker: string): Promise<DividendEvent[]> {
  try {
    const today = new Date()
    const end = formatKrxDate(today)
    const start = formatKrxDate(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()))

    const body = new URLSearchParams({
      bld: 'dbms/MDC/STAT/standard/MDCSTAT04601',
      locale: 'ko_KR',
      isuSrtCd: ticker,
      strtDd: start,
      endDd: end,
      share: '1',
      money: '1',
      csvxls_isNo: 'false',
    })

    const resp = await fetch(KRX_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Referer: 'https://data.krx.co.kr/',
        'User-Agent': 'Mozilla/5.0 (compatible; dividend-web/1.0)',
      },
      body: body.toString(),
    })

    if (!resp.ok) return []
    const data = await resp.json()
    return normalizeKrxData(ticker, data)
  } catch {
    return []
  }
}

/** Exported for fixture-based testing (no live network). */
export function normalizeKrxData(ticker: string, raw: KrxResponse): DividendEvent[] {
  if (!raw?.OutBlock_1 || !Array.isArray(raw.OutBlock_1)) return []
  return raw.OutBlock_1.flatMap((row) => {
    const exDate = parseKrxDate(row.RECORD_DATE ?? row.BASE_DATE ?? '')
    const paymentDate = parseKrxDate(row.PAY_DATE ?? '')
    const dps = parseFloat(row.DPS ?? row.CASH_DPS ?? '0') || 0
    if (!exDate || dps <= 0) return []
    return [{
      ticker,
      exDate,
      paymentDate: paymentDate || null,
      dps,
      currency: 'KRW',
    }]
  })
}

// ---------------------------------------------------------------------------
// KRX raw response shape
// ---------------------------------------------------------------------------

export interface KrxResponse {
  OutBlock_1?: KrxRow[]
  [key: string]: unknown
}

interface KrxRow {
  RECORD_DATE?: string  // 기준일 (ex-div date)
  BASE_DATE?: string
  PAY_DATE?: string     // 지급일
  DPS?: string          // 주당배당금
  CASH_DPS?: string
  [key: string]: string | undefined
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatKrxDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

function parseKrxDate(s: string): string | null {
  if (!s || s.length < 8) return null
  const clean = s.replace(/\D/g, '')
  if (clean.length !== 8) return null
  return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`
}
