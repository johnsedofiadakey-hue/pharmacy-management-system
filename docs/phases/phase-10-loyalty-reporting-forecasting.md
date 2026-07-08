# Phase 10 — Loyalty, Reporting & Forecasting

**Status:** Scaffolded — loyalty tiers, the five-category reporting suite, simplified demand forecasting, and branch benchmarking all built; pending live Supabase/Firebase verification
**Date:** 2026-07-08
**Corresponds to:** BLUEPRINT.md § Phase 10

## Goal recap
Loyalty tiers/points, a full reporting suite across sales/profitability/inventory/procurement/
operations, demand forecasting, and refined branch benchmarking.

## What was built
- Schema: `LoyaltyTier` enum (BRONZE/SILVER/GOLD/PLATINUM), `Customer.loyaltyTier`
- `computeLoyaltyTier` / `awardLoyaltyPoints` (`functions/src/lib/loyalty.ts`) — shared helper
  now called from **both** `placeOrder` (Phase 9) and `createSale` (Phase 3) — see Decisions
- `getSalesReport` — daily/product/category/staff/payment-method breakdown over a date range
- `getProfitabilityReport` — margin computed from each `SaleItem`'s actual `Batch.costPriceAtReceipt`,
  not the product's static reference cost
- `getInventoryReport` — stock valuation, low stock, dead stock (zero sales in 90 days),
  fast/slow movers (30-day units sold), expiry-risk buckets — branch-scoped version of what
  Phase 5's company dashboard already did org-wide
- `getProcurementReport` — supplier spend, pending POs, a simple price-trend signal (latest vs.
  previous unit cost per product/supplier)
- `getOperationsReport` — discounts, stock adjustments by type, transfers by status, cash
  variance across closed till sessions (returns/refunds excluded — see Decisions)
- `getDemandForecast` — moving-average trend classification (see Decisions — explicitly not
  the full blueprint forecasting model)
- `getBranchBenchmarking` — org-wide per-branch sales/margin/stock-loss/expiry-loss over a
  trailing 30-day window, extending Phase 5's company dashboard
- UI: `/branch/reports` (report-type selector covering all five categories + forecast),
  branch benchmarking table added to the existing `/admin/company` page

## Stack & tools used in this phase
No new dependencies.

## Key files / entry points
- `packages/db/prisma/schema.prisma` — `LoyaltyTier`, `Customer.loyaltyTier`
- `functions/src/lib/loyalty.ts`
- `functions/src/pos/createSale.ts`, `functions/src/storefront/placeOrder.ts` — both now call
  `awardLoyaltyPoints`
- `functions/src/reports/` — `getSalesReport.ts`, `getProfitabilityReport.ts`,
  `getInventoryReport.ts`, `getProcurementReport.ts`, `getOperationsReport.ts`,
  `getDemandForecast.ts`, `getBranchBenchmarking.ts`
- `apps/web/src/app/branch/reports/page.tsx`
- `apps/web/src/app/admin/company/page.tsx` — benchmarking table added

## Data model changes
Added `LoyaltyTier` enum and `Customer.loyaltyTier`. No other schema changes — every report
computes from data already captured by Phases 2-9; this phase is entirely about reading what's
already there in useful shapes, not new data capture.

## Decisions & trade-offs
- **Found a real gap while wiring up loyalty for this phase: POS sales (`createSale`) never
  awarded loyalty points at all** — only Phase 9's online `placeOrder` did. An in-store
  purchase is at least as common as an online one and there's no reason it shouldn't earn
  loyalty too. Fixed by extracting the points/tier logic Phase 9 had inlined into a shared
  `awardLoyaltyPoints` helper and calling it from both places — this is the third phase in a
  row where actually wiring up a feature surfaced a real defect in earlier work (Phase 4's
  cross-org query, Phase 9's FK mismatch, now this).
- **Loyalty tier thresholds are a placeholder policy** (BRONZE 0+, SILVER 500+, GOLD 2000+,
  PLATINUM 5000+ points), same category as Phase 4's adjustment-sensitivity threshold — no
  real spend data exists yet to calibrate against.
- **`getDemandForecast` is explicitly a 30-day-vs-prior-30-day moving average with a percent-
  change trend label, not the BLUEPRINT.md §47 model** (day-of-week patterns, seasonality,
  historical stockout correlation). That model needs at least a full season of real transaction
  history to mean anything; building it now against zero live data would produce a
  sophisticated-looking function that's actually guessing. This is the third consecutive phase
  to defer "real forecasting" for the same honest reason (Phase 5's transfer suggestions,
  Phase 6's purchase suggestions) — Phase 10 is where that IOU is partially paid down with a
  real, working, clearly-labeled simpler signal, not where the full model finally appears.
- **`getOperationsReport` excludes returns/refunds** because that feature doesn't exist —
  Phase 3 deliberately deferred void/refund as a distinct workflow. Reporting on data that
  isn't captured would mean either fabricating zeros or silently omitting a whole blueprint
  category; the report's own doc comment says why, rather than pretending completeness.
- **`getProfitabilityReport` and `getBranchBenchmarking` both use `Batch.costPriceAtReceipt`**,
  not `Product.costPrice` — actual acquisition cost varies batch to batch (different supplier
  prices over time), and the batch-level field is what's actually true at the moment of sale.
- **Reports compute everything in application code from raw rows**, not via SQL aggregation
  (`groupBy`/`sum`), for the multi-dimensional ones (sales report's five simultaneous
  breakdowns, in particular). At current expected data volumes (a single pharmacy chain, not
  millions of rows) this is simpler to read and modify than composing multiple `groupBy`
  queries, and it's an optimization to revisit only if a report actually becomes slow — not
  something to prematurely engineer around.

## Known issues / follow-ups
- **Nothing in this phase has been run against a real database.** Verified so far: schema
  generates, all packages build clean, all 68 Cloud Functions (Phases 0-10 combined) load in
  the emulator, and both `/branch/reports` and the extended `/admin/company` page redirect/
  render correctly in an actual browser with zero console errors. This is now the ninth
  consecutive phase stacked on the same unverified foundation.
- No CSV/PDF export for any report (BLUEPRINT.md's reports imply exportability; `REPORTS:EXPORT`
  exists as a permission action but nothing checks it yet).
- No date-range picker in the UI — reports default to a fixed trailing 30 days.
- Returns/refunds remain absent from operations reporting until that feature itself exists.

## How to verify this phase
Once real Supabase/Firebase credentials exist:
1. Complete a POS sale and an online order for the same customer — confirm
   `Customer.loyaltyPoints` increases from *both*, and `loyaltyTier` updates once a threshold
   is crossed
2. Call `getSalesReport` for a branch/date range with known sales — confirm totals match manual
   sums, and the by-product/by-category/by-staff/by-payment breakdowns add up to the same total
3. Call `getProfitabilityReport` — confirm margin uses the actual batch cost, not the product's
   static `costPrice` (receive two batches of the same product at different costs, sell from
   both, confirm profit reflects the mix)
4. Call `getInventoryReport` — confirm a product with stock but no sales in 90 days appears in
   `deadStock`, and a product below its `reorderLevel` appears in `lowStock`
5. Call `getDemandForecast` — sell a product heavily in the last 30 days vs. the prior 30 and
   confirm it's classified `ACCELERATING`
6. Call `getBranchBenchmarking` as Super Admin — confirm per-branch margin/stock-loss/expiry-loss
   numbers are consistent with `getProfitabilityReport`/`getOperationsReport` run per-branch
