# Phase 6 — Procurement & Suppliers

**Status:** Scaffolded — supplier/PO workflow, discrepancy-flagging goods receipt, simplified reorder suggestions, and UI all built; pending live Supabase/Firebase verification
**Date:** 2026-07-08
**Corresponds to:** BLUEPRINT.md § Phase 6

## Goal recap
A full procure-to-stock cycle: supplier profiles, purchase orders, goods receiving that flags
ordered-vs-received discrepancies, and a first pass at reorder suggestions.

## What was built
- Schema: `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`, `PurchaseOrderStatus` enum — and,
  finally, the `Product.preferredSupplierId` / `Batch.supplierId` / `Batch.purchaseOrderId`
  fields that were explicitly deferred back in Phase 2 pending these tables existing
- `createSupplier` / `listSuppliers` — `SUPPLIERS:CREATE`/`VIEW`
- `createPurchaseOrder` — created directly as `SUBMITTED` (no separate draft-editing step);
  `PURCHASES:CREATE` scoped to the receiving branch
- `approvePurchaseOrder` — `SUBMITTED` → `APPROVED`; `PURCHASES:APPROVE`
- `receiveGoods` — the core of this phase: upserts a batch per line (linking
  `supplierId`/`purchaseOrderId` this time, unlike Phase 2's plain `receiveStock`), runs
  `applyStockMovement` (`PURCHASE_RECEIVED`), accumulates `quantityReceived` across possibly
  multiple partial receipts, and returns a `discrepancies` array wherever cumulative received
  doesn't match ordered — surfaced to the caller rather than silently resolved
  (BLUEPRINT.md §24)
- `getPurchaseSuggestions` — simplified low-stock reorder list (see Decisions)
- `listPurchaseOrders`
- `/branch/procurement` — supplier creation, PO creation, approve/receive actions, and a
  read-only reorder-suggestions panel

## Stack & tools used in this phase
No new dependencies.

## Key files / entry points
- `packages/db/prisma/schema.prisma` — `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`,
  `PurchaseOrderStatus`, plus the now-filled-in deferred fields on `Product`/`Batch`
- `functions/src/suppliers/createSupplier.ts`, `listSuppliers.ts`
- `functions/src/procurement/createPurchaseOrder.ts`, `approvePurchaseOrder.ts`,
  `listPurchaseOrders.ts`, `receiveGoods.ts`, `getPurchaseSuggestions.ts`
- `apps/web/src/app/branch/procurement/page.tsx`

## Data model changes
Added `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`, `PurchaseOrderStatus`. Filled in the
three fields deferred since Phase 2 (`Product.preferredSupplierId`, `Batch.supplierId`,
`Batch.purchaseOrderId`) — closing that loop was itself a goal of this phase, not incidental.

## Decisions & trade-offs
- **`getPurchaseSuggestions` is explicitly NOT the full BLUEPRINT.md §22 algorithm.** The
  blueprint wants suggestions driven by average daily sales, lead time, safety stock, and
  seasonality — that requires real sales-velocity history and is Phase 10 (Demand Forecasting)
  territory, same reasoning as Phase 5 deferring automatic transfer suggestions. What's built
  instead answers a narrower, honest question: "what's at or below its reorder level right
  now," suggesting a top-up to `maxStock` (or 2× reorder level as a fallback). This matches
  BLUEPRINT.md §21's own acknowledgment that "smaller pharmacies may use a simplified
  procurement workflow" — it's a legitimate simpler tier, not a stub pretending to be the real
  algorithm.
- **`receiveGoods` supports successive partial receipts** — each call adds to
  `quantityReceived` cumulatively rather than replacing it, so a supplier who delivers a
  purchase order across two truck runs doesn't need special handling. The order status
  (`PARTIALLY_RECEIVED` vs `RECEIVED`) is recomputed from all items every time.
  Discrepancies are returned in the response for the caller to act on — no separate
  "discrepancy resolution" workflow/table was built (per BLUEPRINT.md §24: "discrepancies
  should require resolution"), since what "resolution" means (contact supplier? adjust the
  invoice? accept the shortfall?) isn't specified enough yet to model as a real workflow rather
  than an arbitrary guess.
- **No DRAFT-state editing step** — `createPurchaseOrder` goes straight to `SUBMITTED`, same
  simplification pattern as Phase 5 collapsing transfer's PREPARING/DISPATCHED states.
- **No `SENT` transition function** — the status exists in the enum for future use (e.g. a
  "mark as sent to supplier" tracking step) but `receiveGoods` already accepts `APPROVED`
  directly, so nothing currently requires passing through `SENT`.
- **UI receiving always uses the full remaining quantity** in one call, and auto-generates a
  batch number from the PO id rather than letting the user enter the supplier's actual batch
  number/expiry per line — the Cloud Function fully supports real per-line batch numbers and
  expiry dates; the UI is the simplified part here, consistent with how POS/transfers UIs were
  also scoped narrower than their backing functions.

## Known issues / follow-ups
- **Nothing in this phase has been run against a real database.** Verified so far: schema
  generates, all packages build clean, all 37 Cloud Functions (Phases 0-6 combined) load in
  the emulator, and `/branch/procurement` correctly redirects an unauthenticated visitor with
  zero console errors in an actual browser. This is now the fifth consecutive phase stacked on
  the same unverified foundation — live verification of the whole chain (ledger → sales →
  approvals → transfers → procurement) is increasingly the most valuable thing to do next,
  more valuable than continuing to add phases blind.
- No real per-line batch number/expiry entry in the receiving UI (see Decisions).
- No discrepancy-resolution workflow — discrepancies are visible in the API response but there's
  no persisted record of "this discrepancy was reviewed/accepted/disputed."
- No supplier performance scoring (BLUEPRINT.md §23's price competitiveness/delivery
  reliability/order accuracy percentages) — that needs historical PO data to compute against,
  better done once there's real usage.

## How to verify this phase
Once real Supabase/Firebase credentials exist:
1. Create a supplier, then a purchase order for a product with a specific `unitCost`
2. Approve it, then receive goods with a `receivedQuantity` less than `quantityOrdered` —
   confirm the response's `discrepancies` array flags it, the PO status is
   `PARTIALLY_RECEIVED`, and the batch has `supplierId`/`purchaseOrderId` set correctly
3. Receive the remaining quantity — confirm the PO status becomes `RECEIVED` and
   `BranchStock` reflects the full amount
4. Set a product's `reorderLevel`/`maxStock` and drop its branch stock below `reorderLevel`
   (e.g. via a sale or adjustment) — confirm `getPurchaseSuggestions` lists it with a sensible
   `suggestedOrderQuantity`
