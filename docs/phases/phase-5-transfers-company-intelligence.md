# Phase 5 — Inter-Branch Transfers & Company Intelligence

**Status:** Scaffolded — transfer workflow, company dashboard, and UI all built; automatic transfer-suggestion algorithm and variance-approval deferred; pending live Supabase/Firebase verification
**Date:** 2026-07-07
**Corresponds to:** BLUEPRINT.md § Phase 5

## Goal recap
Move stock correctly between branches through a request → approve → dispatch → receive
workflow, and give the Super Admin an org-wide view: today's numbers per branch, and expiry
risk across the whole company.

## What was built
- Schema: `StockTransfer`, `StockTransferItem`, `TransferStatus` enum (simplified from the
  blueprint's full 9-state list — see Decisions)
- `requestTransfer` — destination branch requests specific product/batch/quantity from a
  source branch; `TRANSFERS:CREATE` scoped to the destination
- `approveTransfer` / `rejectTransfer` — source branch decides; `TRANSFERS:APPROVE` scoped to
  the source
- `dispatchTransfer` — source branch deducts stock (via `applyStockMovement`,
  `TRANSFER_OUT`) for the exact batches requested (not FEFO — the batch was already chosen at
  request time) and moves the transfer to `IN_TRANSIT`; `TRANSFERS:EDIT` scoped to source
- `receiveTransfer` — destination branch adds stock (`TRANSFER_IN`) for the *same* batch
  records the source dispatched, marking the transfer `RECEIVED` or `PARTIALLY_RECEIVED`
  depending on whether received matches sent; `TRANSFERS:EDIT` scoped to destination
- `cancelTransfer` — destination branch withdraws its own request, only before dispatch;
  `TRANSFERS:CANCEL` scoped to destination
- `listTransfers` — branch-scoped (either side of the transfer)
- `getCompanyDashboard` — org-wide totals (sales/transactions today, active branch count),
  a per-branch breakdown, and expiry-risk value buckets (expired / 30 / 90 / 180 days);
  requires an **org-wide** `REPORTS:VIEW` grant, so a branch-scoped Branch Manager role cannot
  call it — only Super Admin/Head Office-type roles
- `/branch/transfers` — request/approve/reject/dispatch/receive/cancel UI, sourcing available
  batches from `listBranchStock` on the selected source branch
- `/admin/company` — company dashboard page

## Stack & tools used in this phase
No new dependencies.

## Key files / entry points
- `packages/db/prisma/schema.prisma` — `StockTransfer`, `StockTransferItem`, `TransferStatus`
- `packages/db/prisma/seed.ts` — `branch_manager` and `inventory_officer` grants extended
  with `TRANSFERS:EDIT`/`CANCEL` (dispatch/receive/cancel need `EDIT`, which neither role had
  before this phase)
- `functions/src/transfers/requestTransfer.ts`, `approveTransfer.ts`, `rejectTransfer.ts`,
  `cancelTransfer.ts`, `dispatchTransfer.ts`, `receiveTransfer.ts`, `listTransfers.ts`
- `functions/src/dashboard/getCompanyDashboard.ts`
- `apps/web/src/app/branch/transfers/page.tsx`, `apps/web/src/app/admin/company/page.tsx`

## Data model changes
Added `StockTransfer`, `StockTransferItem`, `TransferStatus`. No changes to Phase 0-4 tables.

## Decisions & trade-offs
- **`TransferStatus` collapses the blueprint's PREPARING/DISPATCHED into a single
  APPROVED → IN_TRANSIT transition.** Those two are warehouse-picking UI states with no
  distinct business logic in this scaffold (no separate "picking" step is modeled) —
  keeping the extra states would just be enum values nothing ever transitions through.
- **A transfer never reassigns which `Batch` row it moves.** Because `Batch` is a
  product-level record (not owned by a branch) and `BranchStock` is the per-branch quantity,
  a transfer is literally: deduct from `BranchStock(source, batchId)`, add to
  `BranchStock(dest, batchId)`, same `batchId` throughout. This is what guarantees expiry data
  moves correctly with the stock (BLUEPRINT.md §20) — there's no batch-remapping logic to get
  wrong because there's no batch remapping at all.
- **`getCompanyDashboard` computes on demand from Postgres, not a Firestore projection** like
  the Phase 4 branch dashboard. It doesn't need the same "instantly reflects the last mutation"
  property — a Super Admin opening a company-wide view once in a while doesn't justify
  recomputing org-wide aggregates after every single sale across every branch.
- **Automatic expiry-driven transfer suggestions are deliberately not built**
  (BLUEPRINT.md §16's "Osu sells 45/month, transfer 48 units there" example). That requires
  comparing sales velocity across branches per product — real demand-forecasting logic, which
  is explicitly Phase 10 scope ("Demand Forecasting"). Building a rough version now would
  either be a fake stub or scope creep into a later phase's actual job; Phase 5 only exposes
  the raw expiry-risk *visibility* (the value buckets), not automated *suggestions*.
- **No variance-approval gate on `closeTill`** — flagged again from Phase 4, still not built;
  large cash discrepancies are recorded but not escalated for review.
- **UI dispatch/receive always use the full requested/sent quantity** — the Cloud Functions
  support partial dispatch/receipt (`quantitySent`/`quantityReceived` per item, independently),
  but the UI doesn't yet expose editing those numbers per line before submitting.

## Known issues / follow-ups
- **Nothing in this phase has been run against a real database.** Verified so far: schema
  generates, all packages build clean, all 30 Cloud Functions (Phases 0-5 combined) load in
  the emulator, and both new pages (`/branch/transfers`, `/admin/company`) redirect an
  unauthenticated visitor correctly with zero console errors in an actual browser. This is now
  the fourth consecutive phase built on the same unverified ledger/sale/approval foundation —
  live verification remains the single highest-value next step before continuing further.
- No partial-quantity UI for dispatch/receive (see Decisions above).
- No branch benchmarking beyond sales/transaction counts — margin and stock-loss comparisons
  (BLUEPRINT.md §48) need per-sale profitability data not computed until Phase 10's reporting
  work.
- No automatic transfer suggestions (see Decisions above) — Phase 10 territory.

## How to verify this phase
Once real Supabase/Firebase credentials exist:
1. As a user with a role at the destination branch, request a transfer for a batch that
   exists (with stock) at a different branch
2. As a user with a role at the source branch, approve it, then dispatch it — confirm
   `StockMovement` with `TRANSFER_OUT` is created at the source and `BranchStock` there
   decreases; transfer status becomes `IN_TRANSIT`
3. As a user at the destination, receive it — confirm `StockMovement` with `TRANSFER_IN` at
   the destination, `BranchStock` there increases for the *same* `batchId`, and the batch's
   `expiryDate` is unchanged/correct; transfer status becomes `RECEIVED`
4. Try receiving a smaller quantity than was sent — confirm status becomes
   `PARTIALLY_RECEIVED` instead
5. Call `getCompanyDashboard` as a Super Admin — confirm branch breakdown and expiry-risk
   numbers match manual queries; confirm a branch-scoped Branch Manager role gets
   `permission-denied` calling the same function
