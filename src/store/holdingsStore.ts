import type { Market, AccountType, IsaType } from '../domain/types.js'

export const STORAGE_KEY = 'dividend-app:holdings:v1'
export const SCHEMA_VERSION = 1

export interface StoredPosition {
  id: string
  ticker: string
  market: Market
  quantity: number
  costBasis: number
  accountType: AccountType
  isaType?: IsaType
  schemaVersion: number
}

export class ValidationError extends Error {}

const VALID_ACCOUNT_TYPES: AccountType[] = ['ISA', 'PENSION', 'GENERAL']

function validateAccountType(value: unknown): asserts value is AccountType {
  if (!VALID_ACCOUNT_TYPES.includes(value as AccountType)) {
    throw new ValidationError(
      `accountType must be one of ${VALID_ACCOUNT_TYPES.join(', ')}; got: ${String(value)}`
    )
  }
}

function readAll(): StoredPosition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(positions: StoredPosition[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(positions))
}

export function getHoldings(): StoredPosition[] {
  return readAll()
}

export interface AddHoldingInput {
  ticker: string
  market: Market
  quantity: number
  costBasis: number
  accountType: AccountType
  isaType?: IsaType
}

export function addHolding(input: AddHoldingInput): StoredPosition {
  validateAccountType(input.accountType)
  const record: StoredPosition = {
    id: crypto.randomUUID(),
    ticker: input.ticker.toUpperCase(),
    market: input.market,
    quantity: input.quantity,
    costBasis: input.costBasis,
    accountType: input.accountType,
    ...(input.isaType ? { isaType: input.isaType } : {}),
    schemaVersion: SCHEMA_VERSION,
  }
  const all = readAll()
  writeAll([...all, record])
  return record
}

export type UpdateHoldingInput = Partial<Omit<StoredPosition, 'id' | 'schemaVersion'>>

export function updateHolding(id: string, changes: UpdateHoldingInput): StoredPosition {
  if (changes.accountType !== undefined) {
    validateAccountType(changes.accountType)
  }
  const all = readAll()
  const idx = all.findIndex((p) => p.id === id)
  if (idx === -1) throw new Error(`Holding not found: ${id}`)
  const updated: StoredPosition = { ...all[idx], ...changes }
  all[idx] = updated
  writeAll(all)
  return updated
}

export function deleteHolding(id: string): void {
  const all = readAll()
  writeAll(all.filter((p) => p.id !== id))
}
