# Phase 11 — Fraud Detection, Audit & Compliance

**Status:** Scaffolded — suspicious-activity alerts, drug recall workflow, adverse reaction reporting, a real (if selective) audit log, and NHIS scaffolding all built; pending live Supabase/Firebase verification
**Date:** 2026-07-08
**Corresponds to:** BLUEPRINT.md § Phase 11

## Goal recap
Suspicious-activity alerts, a drug recall system, adverse reaction reporting, a full
audit-trail view for auditors, and NHIS module scaffolding.

## What was built
- Schema: `Batch.recallStatus` + `DrugRecall`, `AdverseReactionReport`, `AuditLog`,
  `NhisClaim`/`NhisClaimStatus`, `Customer.nhisNumber`
- `initiateDrugRecall` / `resolveDrugRecall` — org-wide (`STOCK:APPROVE`, branchId null),
  sets `Batch.recallStatus` and writes a `DrugRecall` history row + audit log entry
- **`deductStockFefo` now excludes `RECALLED` batches entirely** — the actual "block further
  sale" enforcement, checked on every POS sale and online order
- `getRecallImpactReport` — remaining quantity per branch + affected customers, both derived
  from existing `SaleItem`/`OrderItem`/`BranchStock` rows referencing the recalled batch, no
  new denormalized tracking needed
- `listDrugRecalls`
- `reportAdverseReaction` / `listAdverseReactionReports` — gated like Phase 8's clinical
  actions (`requirePermissionAnyBranch` on `PATIENTS`)
- `recordAuditLog` helper + **`updateProductPricing`** (a genuinely new function — Phase 2
  never built a product-update path at all) — wired together, this is the concrete instance
  of BLUEPRINT.md §53's own example ("John changed Amoxicillin price from GH₵40 to GH₵32")
- Audit logging also added to `assignUserRole`, `setBranchActive`, and
  `reviewStockAdjustmentRequest` (approve and reject) — see Decisions for why these four and
  not an exhaustive retrofit
- `listAuditLog` — org-wide, last 200 entries
- `getSuspiciousActivityAlerts` — discount-rate outliers per cashier, stock-adjustment
  frequency per user, repeated large till variances (see Decisions for what's deliberately
  not detectable)
- `createNhisClaim` / `listNhisClaims` — minimal scaffold, no real e-claims submission
- `/admin/compliance` — alerts, recalls (initiate/resolve), adverse reaction reports, and the
  audit log in one page

## Stack & tools used in this phase
No new dependencies.

## Key files / entry points
- `packages/db/prisma/schema.prisma` — `BatchRecallStatus`, `DrugRecall`, `RecallStatus`,
  `AdverseReactionReport`, `AuditLog`, `NhisClaimStatus`, `NhisClaim`, `Customer.nhisNumber`
- `functions/src/lib/auditLog.ts` — `recordAuditLog`
- `functions/src/compliance/` — `initiateDrugRecall.ts`, `resolveDrugRecall.ts`,
  `getRecallImpactReport.ts`, `listDrugRecalls.ts`, `reportAdverseReaction.ts`,
  `listAdverseReactionReports.ts`, `listAuditLog.ts`, `getSuspiciousActivityAlerts.ts`
- `functions/src/products/updateProductPricing.ts`
- `functions/src/inventory/fefo.ts` — recall exclusion added to the FEFO query
- `functions/src/roles/assignUserRole.ts`, `functions/src/branches/setBranchActive.ts`,
  `functions/src/inventory/reviewStockAdjustmentRequest.ts` — `recordAuditLog` calls added
- `functions/src/nhis/createNhisClaim.ts`, `listNhisClaims.ts`
- `apps/web/src/app/admin/compliance/page.tsx`

## Data model changes
Added `Batch.recallStatus`, `DrugRecall`, `AdverseReactionReport`, `AuditLog`, `NhisClaim`,
`Customer.nhisNumber`. Hit one relation-validation error while writing the schema (forgot the
`Batch.adverseReactionReports` back-relation) — caught immediately by `prisma generate`
refusing to run, fixed before it went anywhere.

## Decisions & trade-offs
- **`AuditLog` is wired into four specific mutations, not all ~70 Cloud Functions in this
  project.** BLUEPRINT.md §53 gives concrete examples — a price change, and by extension
  role/branch/approval changes — not "log literally everything." An exhaustive retrofit would
  mean touching nearly every function file for marginal value on the ones that aren't
  genuinely sensitive (e.g., logging every `listProducts` call teaches nothing). The four
  chosen (`updateProductPricing`, `assignUserRole`, `setBranchActive`,
  `reviewStockAdjustmentRequest`) match the blueprint's own worked example plus the other
  actions in this codebase with comparable stakes (who can do what, and stock integrity).
  Extending this list to more mutations later is cheap — `recordAuditLog` already exists and
  takes one line to call.
- **`Batch.recallStatus` is a denormalized field, not derived from `DrugRecall` on every
  read.** It's checked inside `deductStockFefo`'s hot path on every single sale and online
  order — querying/joining `DrugRecall` there on every checkout would be real, avoidable
  overhead for a value that changes rarely. `DrugRecall` remains the source of truth for *why*
  and *when*; the batch field is just a fast "is this currently blocked" flag kept in sync by
  the only two functions that ever change it.
- **`getSuspiciousActivityAlerts` implements 3 of the blueprint's ~7 example triggers, not
  all of them, and says so in its own doc comment.** "Many voided transactions" and "repeated
  refunds" have no data to check — void/refund was deliberately deferred all the way back in
  Phase 3 and still doesn't exist. Building alerts for data that isn't captured would mean
  either fabricating always-zero results or quietly pretending the check runs; the honest
  choice is to implement what's checkable (discount-rate outliers, adjustment frequency, cash
  variance repeats) and document the gap, so nobody reading this later mistakes "not
  triggered" for "verified safe."
- **NHIS scaffolding is intentionally thin** — a `DRAFT`-only claim record with no submission
  logic, exactly matching BLUEPRINT.md §44's own framing ("should be designed so that future
  e-claims integration is possible"). There's no NHIS API to integrate with yet, so anything
  beyond a data shape ready to be filled in would be speculative.
- **`getRecallImpactReport`'s "affected customers" is computed from existing sale/order
  records**, not a new tracking table populated at time of sale — the data already exists;
  querying it at recall time is simpler and can't drift out of sync with the actual
  transaction history.

## Known issues / follow-ups
- **Nothing in this phase has been run against a real database.** Verified so far: schema
  generates, all packages build clean, all 79 Cloud Functions (Phases 0-11 combined) load in
  the emulator, and `/admin/compliance` correctly redirects an unauthenticated visitor with
  zero console errors in an actual browser. This is now the tenth consecutive phase stacked
  on the same unverified foundation — the recall-blocks-sale behavior in particular is worth
  a real end-to-end test given its regulatory relevance.
- Recall initiation UI takes a raw batch ID with no picker — needs a proper product/batch
  search.
- Audit logging doesn't cover every sensitive action yet (see Decisions) — a reasonable next
  addition would be purchase order approval and transfer approval, which have comparable
  stakes to what's already covered.
- No suspicious-activity detection for restricted-medicine dispensing frequency per pharmacist
  (mentioned in the phase plan but not built this round) — worth adding alongside the existing
  three once there's real usage data to validate thresholds against.
- No push/email notification when a recall is initiated ("notify branches" from BLUEPRINT.md
  §42) — same missing-notification-delivery gap as Phase 1's staff invites.

## How to verify this phase
Once real Supabase/Firebase credentials exist:
1. Change a product's retail price via `updateProductPricing` — confirm an `AuditLog` row is
   created with the correct `oldValue`/`newValue`
2. Initiate a recall on a batch with existing branch stock — confirm `Batch.recallStatus`
   becomes `RECALLED` and attempting to sell that product (via `createSale` or `placeOrder`)
   either fails (if that was the only batch) or skips it entirely (if other unrecalled batches
   exist for the same product)
3. Call `getRecallImpactReport` — confirm it lists the correct remaining quantity per branch
   and any customers who bought from that batch before the recall
4. Resolve the recall — confirm the batch becomes sellable again
5. Generate enough sales with skewed discounts/adjustments/till variances for one
   cashier/user, then call `getSuspiciousActivityAlerts` — confirm the right alert types fire
6. Call `listAuditLog` as an auditor-role user and confirm entries from steps 1-2 appear
