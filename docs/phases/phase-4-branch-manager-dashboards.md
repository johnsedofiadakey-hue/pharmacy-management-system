# Phase 4 — Branch Manager & Live Dashboards

**Status:** Scaffolded — shifts, stock adjustment approval workflow, live Firestore dashboard, and UI all built; pending live Supabase/Firebase verification
**Date:** 2026-07-07
**Corresponds to:** BLUEPRINT.md § Phase 4

## Goal recap
Give the Branch Manager a dashboard that reflects real Postgres state in near real time, plus
an enforced approval workflow for sensitive stock adjustments (deferred from Phase 2).

## What was built
- Schema: `Shift` (clock in/out), `StockAdjustmentRequest` (pending sensitive adjustments)
- `clockIn` / `clockOut` — self-service attendance, not gated by the permission matrix (any
  staff member with a role at the branch can clock themselves in/out)
- `adjustStock` (Phase 2) now branches on sensitivity: THEFT/LOSS reasons, or any adjustment
  ≥50 units in magnitude, create a `StockAdjustmentRequest` (`PENDING`) instead of applying
  immediately; everything else still applies immediately as before
- `reviewStockAdjustmentRequest` — Branch Manager approves (runs the deferred
  `applyStockMovement` with `approvalStatus: APPROVED`) or rejects (no ledger change) a
  pending request; gated on `STOCK:APPROVE`
- `listPendingStockAdjustmentRequests` — branch-scoped pending queue
- `refreshBranchDashboard(branchId)` — internal function computing today's sales
  total/count, cash collected, pending-approvals count, staff-clocked-in count, and low-stock
  product count, writing to Firestore `branch_live/{branchId}`. Called as a side effect after
  `createSale`, `closeTill`, and `reviewStockAdjustmentRequest` (approval path) — this is what
  makes the dashboard "live" without any Postgres change-data-capture mechanism
- `requestDashboardRefresh` — manual/testing callable wrapper around the above
- `firestore.rules` — added a `branch_live/{branchId}` read rule, org-scoped via the
  `orgId` custom claim (branch-level scoping isn't checkable from claims alone — see Phase 0's
  decision to keep claims minimal — so this is coarser than ideal, narrowed by the app only
  ever requesting branches the user's role list includes)
- `/branch/dashboard` — live-updating page (Firestore `onSnapshot`, not polling) showing the
  five dashboard numbers, clock in/out, and a pending-approvals list with approve/reject buttons

## Stack & tools used in this phase
No new dependencies — same stack throughout. First phase to use Firestore's client-side
`onSnapshot` for a genuinely real-time UI (`useBranchLive` hook).

## Key files / entry points
- `packages/db/prisma/schema.prisma` — `Shift`, `StockAdjustmentRequest` models
- `functions/src/shifts/clockIn.ts`, `clockOut.ts`
- `functions/src/inventory/adjustmentPolicy.ts` — `isSensitiveAdjustment`
- `functions/src/inventory/adjustStock.ts` (modified), `reviewStockAdjustmentRequest.ts`,
  `listPendingStockAdjustmentRequests.ts`
- `functions/src/dashboard/refreshBranchDashboard.ts`, `requestDashboardRefresh.ts`
- `firestore.rules` — `branch_live/{branchId}` rule
- `apps/web/src/lib/firebase/useBranchLive.ts`
- `apps/web/src/app/branch/layout.tsx`, `apps/web/src/app/branch/dashboard/page.tsx`
- `apps/web/src/components/RequireAuth.tsx` — the auth guard is now shared across
  `/admin`, `/pos`, and `/branch` layouts instead of duplicated per-route

## Data model changes
Added `Shift`, `StockAdjustmentRequest`, and their back-relations. No changes to existing
Phase 0-3 tables.

## Decisions & trade-offs
- **`StockAdjustmentRequest` is a separate table from `StockMovement`, not a `StockMovement`
  with a "pending" status.** The ledger only ever records changes that actually happened to
  `branch_stock`, applied atomically via `applyStockMovement` — a request that might still be
  rejected has no business affecting the balance, so it can't live in the same table as
  confirmed movements without breaking that invariant.
- **Sensitivity policy is a placeholder constant** (`adjustmentPolicy.ts`): THEFT/LOSS always
  need approval; anything else needs approval past 50 units. There's no per-organisation
  configuration for this yet — a real threshold (likely tied to stock value, not just raw
  quantity) is a reasonable future refinement once there's actual usage data to calibrate
  against, not something to guess at now.
- **The dashboard refreshes as a side effect of mutations, not on a timer.** Firebase has no
  native change-data-capture for an external Postgres database, so "real time" here means
  "recomputed immediately after anything that would change these numbers," which is
  sufficient for the exit criteria and avoids running a cron job that mostly does nothing.
- **Found and fixed a real multi-tenancy bug while wiring this up**: `refreshBranchDashboard`'s
  low-stock query originally fetched `Product.findMany({ where: { reorderLevel: { not: null } } })`
  with no `organisationId` filter at all — invisible right now with one organisation, but a
  real cross-org data leak the moment Phase 13 (SaaS multi-tenancy) adds a second one. Fixed
  by fetching the branch first and scoping the product query to its `organisationId`.
- **`branch_live` Firestore rule is org-scoped, not branch-scoped**, consistent with the
  Phase 0 decision to keep custom claims small (no per-branch list in the token). This means
  any authenticated member of the org could technically read any branch's live numbers if
  they guessed the branch ID — acceptable for now since the UI never surfaces branches outside
  a user's assignments, but worth tightening (e.g. via the Firestore `users/{uid}` mirror
  doc's `branchIds` array) before this matters for a real multi-branch-with-secrecy scenario.
- **`RequireAuth` extracted into a shared component** (`apps/web/src/components/RequireAuth.tsx`)
  used by `admin/layout.tsx`, `pos/layout.tsx`, and the new `branch/layout.tsx` — Phase 3 had
  started duplicating this logic; three call sites was the right point to factor it out.

## Known issues / follow-ups
- **Nothing in this phase has been run against a real database or Firebase project.** Verified
  so far: schema generates, all packages build clean, all 22 Cloud Functions load in the
  emulator, and `/branch/dashboard` correctly redirects an unauthenticated visitor with zero
  console errors in an actual browser. This is now the third consecutive phase stacked on an
  unverified foundation (Phase 2's ledger, Phase 3's sale flow, and now this phase's approval
  workflow and dashboard) — live verification is increasingly overdue and should happen before
  building much further.
- No variance-approval workflow on `closeTill` — large cash discrepancies aren't flagged for
  review yet, only recorded.
- Branch selection in both `/pos` and `/branch/dashboard` is still a manual dropdown, not
  auto-detected from the signed-in user's assigned branch (same follow-up noted in Phase 3).
- No UI for viewing shift history/performance (BLUEPRINT.md §39's "Cashier A — Sales:
  GH₵22,000, Transactions: 310...") — only clock in/out exists.

## How to verify this phase
Once real Supabase/Firebase credentials exist:
1. Sign in, open `/branch/dashboard`, select a branch, clock in — confirm a `Shift` row is
   created with `clockOutAt: null`
2. In another session/tab (as a cashier), complete a sale via `/pos` — confirm the dashboard's
   "Today's sales" and "Cash collected" numbers update live, without reloading the page
3. Call `adjustStock` with `ADJUSTMENT_THEFT` — confirm it returns `pendingApproval: true` and
   creates a `StockAdjustmentRequest`, and that `branch_stock` is unchanged
4. Approve that request from `/branch/dashboard` — confirm `branch_stock` updates, a
   `StockMovement` row is created with `approvalStatus: APPROVED` and the original requester as
   `performedByUserId`, and the dashboard's pending-approvals count drops
5. Reject a different pending request — confirm no `StockMovement` is created and
   `branch_stock` is unchanged
6. Close the till and confirm `closingExpected`/`variance` match manual arithmetic
