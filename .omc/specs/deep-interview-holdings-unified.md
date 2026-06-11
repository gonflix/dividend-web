# Deep Interview Spec: 보유종목 탭 통합 (Holdings Unified Page)

## Metadata
- Interview ID: di-holdings-merge-2026-0611
- Rounds: 8
- Final Ambiguity Score: 16%
- Type: brownfield
- Generated: 2026-06-11
- Threshold: 0.20
- Threshold Source: default
- Initial Context Summarized: no
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.91 | 0.35 | 0.319 |
| Constraint Clarity | 0.85 | 0.25 | 0.213 |
| Success Criteria | 0.72 | 0.25 | 0.180 |
| Context Clarity | 0.85 | 0.15 | 0.128 |
| **Total Clarity** | | | **0.840** |
| **Ambiguity** | | | **16%** |

## Topology
| Component | Status | Description | Coverage |
|-----------|--------|-------------|----------|
| Navigation Merge | active | Remove 탐색 tab; fold ExplorerPage into /holdings; 3-tab nav: 보유종목 / 캘린더 / 시나리오 | Covered by AC-NAV |
| Portfolio Dashboard | active | Pie chart (per-ticker by market value) + 4 KPI cards (총평가금액, 연간예상배당금, 이번달예상배당금, 가중평균배당율) | Covered by AC-DASH |
| Enhanced Holdings List | active | Per-stock table: 수량 / 평가액 / 연배당금; "—" on fetch failure | Covered by AC-LIST |
| Search & Add Modal | active | Search bar at top of page + modal form (수량, 평균단가, 계좌종류, conditional ISA sub-type) | Covered by AC-MODAL |

## Goal

Merge the 탐색(Explorer) and 보유종목(Holdings) tabs into a single **보유종목** tab. The unified page has three vertical sections:

1. **Top — Search**: Existing ticker search bar and result card. The result card gains a "보유종목에 추가" button that opens a modal form.
2. **Middle — Portfolio Dashboard**: Pie chart of per-ticker asset allocation (by current market value), plus 4 KPI cards.
3. **Bottom — Holdings List**: Per-stock table with 수량, 현재 평가액, 연간배당금.

All monetary values default to KRW with a toggle to switch to USD. Live prices are fetched for all holdings on page load via `fetchStock(ticker)` in parallel.

## Constraints

- **Data fetch on load**: `fetchStock(ticker)` called in parallel for every holding in `getHoldings()` + `fetchFxRate()` for USD/KRW conversion. No additional API calls beyond these.
- **Dividend calculation**: `annualDividendYield × price × quantity` from `StockQuote` (already returned by `fetchStock`). No calendar API call needed for annual dividend.
- **이번달 배당금**: Filter `StockQuote.dividendEvents` for `paymentDate` in the current calendar month; sum `dps × quantity`. Show ₩0 (or $0) if no events fall in the current month.
- **Failed fetch**: Show "—" for that ticker's 평가액 and 배당금 columns. The ticker still appears in the holdings list. Failed tickers are excluded from KPI totals and pie chart (they have no market value).
- **Currency toggle**: KRW default. USD toggle swaps all monetary displays. KR stock prices are converted to USD using `1 / usdkrw` from `FxRate`. US stock prices are converted to KRW using `usdToKrw` from `src/domain/fx.ts`.
- **No new API endpoints**: All data comes from existing `/api/stock/[ticker]` and `/api/fx/usdkrw` proxy routes.
- **ISA sub-type**: Modal shows a conditional 일반형/서민형 selector when accountType = ISA. Maps to existing `isaType` field in `StoredPosition`.
- **After add**: Modal closes → holdings list re-reads from localStorage → price fetches re-trigger for the updated holdings set → dashboard re-renders.
- **/explorer route**: Remove the 탐색 NavLink. The `/explorer` route can redirect to `/holdings`. Root `/` also redirects to `/holdings`.

## Non-Goals

- Editing existing holdings (quantity, cost basis) — still delete-only
- Sorting or filtering the holdings list
- Real-time price streaming (daily cache is sufficient)
- Dividend briefing or news feed
- Export / import of holdings
- ISA sub-type for existing holdings that were added before this change (they keep `isaType: undefined`)

## Acceptance Criteria

### AC-NAV: Navigation Merge
- [ ] The top nav shows exactly 3 links: 보유종목 / 캘린더 / 시나리오 (탐색 link is removed)
- [ ] Navigating to `/explorer` redirects to `/holdings`
- [ ] Navigating to `/` redirects to `/holdings`
- [ ] `npm run build` succeeds with no TypeScript errors after ExplorerPage route removal

### AC-DASH: Portfolio Dashboard
- [ ] A `<PortfolioDashboard>` component renders between the search section and the holdings list
- [ ] The pie chart displays one slice per ticker; each slice value = `price × quantity` (in display currency)
- [ ] 총평가금액 KPI = sum of `price × quantity` across all holdings where fetch succeeded, in display currency
- [ ] 연간예상배당금 KPI = sum of `annualDividendYield × price × quantity` across all holdings where fetch succeeded
- [ ] 이번달예상배당금 KPI = sum of `dps × quantity` for all `dividendEvents` where `paymentDate` is within the current calendar month; shows ₩0 (or $0) if no events
- [ ] 가중평균배당율 KPI = `Σ(annualDividendYield × marketValue_i) / Σ(marketValue_i)` × 100%, displayed as a percentage (e.g., 3.2%)
- [ ] A KRW/USD currency toggle exists in the dashboard section; toggling it switches all monetary displays
- [ ] While fetches are in progress, the dashboard shows a loading state (spinner or skeleton)
- [ ] Holdings with failed fetches are excluded from pie chart and all KPI totals

### AC-LIST: Enhanced Holdings List
- [ ] The holdings table shows columns: 티커 / 시장 / 수량 / 평가액 / 연배당금 / 계좌 / (삭제)
- [ ] 평가액 = `price × quantity` in display currency; shows "—" if fetch failed
- [ ] 연배당금 = `annualDividendYield × price × quantity` in display currency; shows "—" if fetch failed
- [ ] Toggling the currency switch updates 평가액 and 연배당금 columns instantly (no re-fetch)
- [ ] Empty state message still appears when `getHoldings()` returns `[]`

### AC-MODAL: Search & Add Modal
- [ ] `StockDetailCard` (existing) gains a "보유종목에 추가" button
- [ ] Clicking the button opens a modal overlay with fields: 수량 (number), 평균단가 (number, KRW), 계좌종류 (ISA / 연금저축 / 일반)
- [ ] When 계좌종류 = ISA, a second select appears: ISA 종류 (일반형 / 서민형)
- [ ] Ticker and market are pre-filled from the search result and not editable in the modal
- [ ] On confirm: `addHolding` is called, modal closes, holdings list + dashboard re-render with fresh data
- [ ] On cancel / backdrop click: modal closes with no changes
- [ ] The old inline `<HoldingForm>` below the holdings table is removed from `HoldingsPage`

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| Live price needed for portfolio | Could cost basis be used instead? | Auto-fetch on page load for all holdings |
| All values in KRW | Could mixed currencies work? | KRW default + USD toggle |
| 4 KPI cards always shown | 이번달 배당금 is 0 most months — is it useful? | Show ₩0 explicitly; user confirmed |
| Pie chart slices by ticker | Could also be by market or account type | Per-ticker confirmed |
| Modal has 3 fields only | Should ISA sub-type be included? | Yes — conditional ISA 일반형/서민형 |

## Technical Context

### Existing files affected
| File | Change |
|------|--------|
| `src/App.tsx` | Remove 탐색 NavLink + /explorer Route; add redirects for / and /explorer → /holdings |
| `src/routes/HoldingsPage.tsx` | Rewrite: add search section at top, mount PortfolioDashboard, update HoldingsTable |
| `src/routes/ExplorerPage.tsx` | Delete or redirect component |
| `src/components/HoldingForm.tsx` | Remove from HoldingsPage (replaced by modal) |
| `src/components/StockDetailCard.tsx` | Add "보유종목에 추가" button that opens modal |
| `src/components/HoldingsTable.tsx` | Add 평가액 + 연배당금 columns; accept priceData prop |

### New files
| File | Purpose |
|------|---------|
| `src/components/PortfolioDashboard.tsx` | Pie chart (Recharts PieChart) + 4 KPI cards + KRW/USD toggle |
| `src/components/AddHoldingModal.tsx` | Modal form: 수량, 평균단가, 계좌종류, conditional isaType |

### Data flow on page load
```
HoldingsPage mounts
  → getHoldings() reads localStorage
  → fetchFxRate() + Promise.all(holdings.map(h => fetchStock(h.ticker)))
  → aggregate: marketValue, annualDividend, thisMonthDividend, weightedYield per holding
  → pass aggregated data to PortfolioDashboard + enhanced HoldingsTable
```

### Key types (no schema changes needed)
- `StoredPosition.isaType?: IsaType` already exists in `holdingsStore.ts`
- `StockQuote.annualDividendYield` (decimal) already in `dto.ts`
- `StockQuote.dividendEvents: DividendEvent[]` already in `dto.ts`
- `usdToKrw(amount, rate)` already in `src/domain/fx.ts`

## Ontology (Key Entities)
| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| StoredPosition | core domain | id, ticker, market, quantity, costBasis, accountType, isaType | Drives all portfolio calculations |
| StockQuote | external data | ticker, price, currency, annualDividendYield, dividendEvents | Fetched per Position on load |
| DividendEvent | supporting | ticker, exDate, paymentDate, dps, currency | Child of StockQuote |
| FxRate | external data | usdkrw, asOf | Applied to all USD↔KRW conversions |
| PortfolioAggregate | computed | totalValue, annualDividend, thisMonthDividend, weightedYield | Derived from Positions × StockQuotes × FxRate |
| AddHoldingModal | UI | ticker (read-only), market (read-only), quantity, costBasis, accountType, isaType? | Creates StoredPosition |

## Ontology Convergence
| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|----------------|
| 1 | 5 | 5 | — | — | N/A |
| 2–7 | 5–6 | 1 (PortfolioAggregate) | 0 | 5 | 83% |
| 8 | 6 | 0 | 0 | 6 | 100% |

## Interview Transcript
<details>
<summary>Full Q&A (8 rounds)</summary>

### Round 0 — Topology
**Q:** Topology confirmation: 4 components (Navigation Merge, Portfolio Dashboard, Enhanced Holdings List, Search & Add Modal)?
**A:** Looks right (all 4)

### Round 1 — Constraint Clarity
**Q:** When the page loads, how should current prices be obtained for 평가액, KPIs, and pie chart?
**A:** Auto-fetch on page load (N API calls)
**Ambiguity:** 49%

### Round 2 — Goal Clarity
**Q:** How should 연배당금 be calculated?
**A:** Yield from Yahoo quote × price × qty
**Ambiguity:** 43%

### Round 3 — Goal Clarity
**Q:** What does each pie chart slice represent?
**A:** Per ticker (each stock is a slice)
**Ambiguity:** 41%

### Round 4 — Constraint Clarity
**Q:** Currency display — KRW, USD, or toggle?
**A:** KRW by default with KRW/USD toggle
**Ambiguity:** 36%

### Round 5 — Goal Clarity (Contrarian)
**Q:** 이번달 배당금 KPI is 0 most months — what to show when no dividends?
**A:** Show ₩0 explicitly
**Ambiguity:** 31%

### Round 6 — Constraint Clarity (Simplifier)
**Q:** What's the simplest acceptable behaviour when a price fetch fails?
**A:** Show "—" for that ticker's 평가액/배당금
**Ambiguity:** 26%

### Round 7 — Goal Clarity
**Q:** What happens after confirming the Add modal?
**A:** Modal closes, page auto-refreshes
**Ambiguity:** 21%

### Round 8 — Success Criteria
**Q:** Should the modal expose ISA 일반형/서민형 sub-type?
**A:** Yes — show conditional sub-type selector when account = ISA
**Ambiguity:** 16% ✓

</details>
