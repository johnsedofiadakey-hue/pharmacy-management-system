# Phase 2 — Product & Inventory Core (Batch/FEFO Ledger)

**Status:** Scaffolded — schema, ledger engine, and Cloud Functions built; pending live Supabase/Firebase verification
**Date:** 2026-07-07
**Corresponds to:** BLUEPRINT.md § Phase 2

## Goal recap
Product catalogue, batch tracking, the branch_stock/stock_movements ledger, and FEFO
(First-Expiry-First-Out) deduction — the hardest part of the system to get right, and
everything else (POS, transfers, procurement) builds on this.

## What was built
- Schema: `Category`, `Product`, `Batch`, `BranchStock` (cached current balance),
  `StockMovement` (append-only ledger) — see Data model changes below
- `applyStockMovement(tx, params)` — the single point where `branch_stock` and
  `stock_movements` ever change, together, atomically. Never called outside a transaction;
  `branch_stock` is never written except as its side effect
- `deductStockFefo(tx, params)` — picks batches ordered by nearest expiry first (nulls last),
  deducting across as many as needed; throws if total stock is insufficient. Kept as an
  internal library function, not its own Cloud Function (see Decisions below)
- `createProduct`, `listProducts` — Cloud Functions, `PRODUCTS:CREATE`/`PRODUCTS:VIEW`
- `receiveStock` — upserts a batch (creates if new for that product) and records a
  `PURCHASE_RECEIVED` movement, in one transaction; `STOCK:CREATE` scoped to the branch
- `adjustStock` — manual adjustment against one specific known batch, with a required reason
  code (`ADJUSTMENT_DAMAGE`/`EXPIRY`/`LOSS`/`THEFT`/`COUNTING`/`CORRECTION`); `STOCK:EDIT`
  scoped to the branch
- `listBranchStock` — current on-hand stock for a branch, joined with batch + product,
  ordered by nearest expiry; `STOCK:VIEW` scoped to the branch

## Stack & tools used in this phase
No new dependencies — same Prisma/zod/firebase-functions stack as Phase 0/1.

## Key files / entry points
- `packages/db/prisma/schema.prisma` — `Category`, `Product`, `Batch`, `BranchStock`,
  `StockMovement` models, `PrescriptionClassification`/`StockMovementType`/`ApprovalStatus` enums
- `functions/src/inventory/ledger.ts` — `applyStockMovement`
- `functions/src/inventory/fefo.ts` — `deductStockFefo`
- `functions/src/inventory/receiveStock.ts`, `adjustStock.ts`, `listBranchStock.ts`
- `functions/src/products/createProduct.ts`, `listProducts.ts`

## Data model changes
Added `Category`, `Product`, `Batch`, `BranchStock`, `StockMovement`, plus enums
`PrescriptionClassification`, `StockMovementType`, `ApprovalStatus`. Deliberately **deferred**:
`Product.preferredSupplierId`, `Batch.supplierId`, `Batch.purchaseOrderId` — these point at
tables (`suppliers`, `purchase_orders`) that don't exist until Phase 6. Adding them now would
mean either a dangling FK or a nullable-but-meaningless field; better to add them together
with Phase 6's migration.

## Decisions & trade-offs
- **`branch_stock` is a cache, `stock_movements` is the source of truth** — this was the
  central design goal from BLUEPRINT.md §18-19 ("inventory should never change silently").
  `applyStockMovement` enforces this by construction: there is no code path that updates
  `branch_stock.quantityOnHand` other than inside this one function, immediately followed by
  the `stock_movements` insert, in the same DB transaction.
- **`deductStockFefo` is not exposed as its own Cloud Function.** FEFO (spreading a deduction
  automatically across whichever batches have the nearest expiry) is only semantically correct
  for a "we don't care which unit, sell/consume the oldest first" operation — a real sale
  (Phase 3) or an internal transfer dispatch (Phase 5). Manual adjustments (damage/loss/theft/
  expiry/counting) always target one *specific, known* batch — that's what `adjustStock`
  does — because you're recording something that happened to a batch you already identified,
  not asking the system to pick one. Exposing a standalone "deduct via FEFO" endpoint now,
  before there's a real Sale entity to attach it to, would be inventing a fictional feature.
  Phase 3's POS sale flow will call `deductStockFefo` directly (as a function, not another HTTP
  hop) with `movementType: SALE` and a real `referenceId` pointing at the sale.
- **Adjustment reasons map directly to `StockMovementType` values** rather than a separate
  "reason enum" translated internally — simpler, and the ledger's `movementType` column is
  already exactly the right granularity for reporting (BLUEPRINT.md §45.3's low-stock/dead-stock/
  fast-moving reports all group by movement data like this).
- **No approval workflow yet for sensitive adjustments** — `adjustStock` always writes
  `approvalStatus: NOT_REQUIRED`. BLUEPRINT.md §19 wants manager approval for sensitive
  adjustments; that belongs with the rest of the Branch Manager's approvals inbox, which is
  explicitly Phase 4 scope. The `approvalStatus`/`approvedByUserId` columns already exist on
  `StockMovement` so Phase 4 only needs to add the workflow, not the schema.
- Nullable-expiry batches sort **last** in FEFO order (`nulls: "last"`) — a batch with no
  tracked expiry is consumed only after every dated batch is exhausted, which is the safer
  default (you'd rather over-consume a dated batch than accidentally hold onto one you can't
  expiry-check).

## Known issues / follow-ups
- **Nothing in this phase has been run against a real database.** Prisma schema changes were
  verified with `prisma generate` (schema is syntactically/relationally valid) and
  `tsc` builds; all 13 Cloud Functions (Phase 0+1+2 combined) load correctly in the Functions
  emulator. The actual behavior — does FEFO really pick the nearest-expiry batch first, does
  `applyStockMovement` really reject an over-deduction, does the transaction really roll back
  batch creation if the movement insert fails — is unverified until a live Supabase project
  exists. This is the highest-value thing to test first once credentials are in place, given
  how central this ledger is to every later phase.
- No pagination on `listProducts`/`listBranchStock` yet — fine at current scale, revisit if
  product catalogues grow large.
- No UI built yet for any of this phase's functions (no product catalogue page, no
  receive-stock form). Phase 2 was scoped to get the engine right first; UI can follow once
  live-verified, or get built alongside Phase 3's POS (which needs a product search UI anyway).

## How to verify this phase
Once real Supabase/Firebase credentials exist and `pnpm db:migrate` has run:
1. Call `createProduct` to create a test product (e.g. "Paracetamol 500mg")
2. Call `receiveStock` twice for that product at the same branch with two different
   `batchNumber`s and two different `expiryDate`s (one sooner, one later), same quantity
3. Call `listBranchStock` for that branch — confirm both batches show with correct quantities
4. In a scratch script (or once Phase 3 exists, via a real sale), call `deductStockFefo` for a
   quantity spanning both batches — confirm it deducts fully from the nearer-expiry batch
   first, then the remainder from the second, and that `stock_movements` has two rows with
   correct `previousBalance`/`newBalance`
5. Try to deduct more than total stock — confirm it throws `failed-precondition` and neither
   batch's balance changed (transaction rolled back)
6. Call `adjustStock` with `ADJUSTMENT_DAMAGE` and a negative quantity against one batch —
   confirm the ledger and balance update correctly and `reason` is stored
