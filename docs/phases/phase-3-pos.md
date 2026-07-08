# Phase 3 — POS

**Status:** Scaffolded — core sale flow, till sessions, and a minimal POS UI built; void/refund, offline sync, receipts, and split-payment UI still open
**Date:** 2026-07-07
**Corresponds to:** BLUEPRINT.md § Phase 3

## Goal recap
Fast counter sales: product search, cart, checkout with FEFO-aware stock deduction, till
open/close, with the sale/ledger/audit trail all landing correctly and atomically.

## What was built
- Schema: `Customer` (minimal — phone-based lookup only, extended in Phase 8/9),
  `TillSession`, `Sale`, `SaleItem` (one row per batch actually deducted, not per cashier
  line), `SalePayment`, plus `TillSessionStatus`/`SaleStatus`/`PaymentMethod` enums
- `openTill` / `closeTill` — one open till per cashier per branch; closing computes
  expected cash (opening float + cash payments on completed sales in that session) vs. actual,
  and records the variance
- `createSale` — the core POS transaction: validates the till is open and belongs to the
  calling cashier, rejects any line priced below `Product.minSellingPrice`, requires
  payments to sum to the total, then in one DB transaction creates the `Sale`, runs
  `deductStockFefo` per requested line (splitting into multiple `SaleItem` rows if FEFO
  spans batches), and records payments
- `listSales` — branch-scoped, optionally filtered to a till session
- Minimal POS page (`/pos`): branch selection, open/close till, product search-and-tap cart,
  single-payment-method (cash) checkout

## Stack & tools used in this phase
No new dependencies — same Prisma/zod/firebase-functions/Next.js stack.

## Key files / entry points
- `packages/db/prisma/schema.prisma` — `Customer`, `TillSession`, `Sale`, `SaleItem`,
  `SalePayment` models
- `functions/src/pos/openTill.ts`, `closeTill.ts`, `createSale.ts`, `listSales.ts`
- `apps/web/src/components/RequireAuth.tsx` — auth guard, extracted from `admin/layout.tsx`
  so `/pos` could reuse it without duplicating the redirect logic
- `apps/web/src/app/pos/layout.tsx`, `apps/web/src/app/pos/page.tsx`

## Data model changes
Added `Customer`, `TillSession`, `Sale`, `SaleItem`, `SalePayment` and their enums. `Customer`
is intentionally minimal (phone, name, email, isPatient flag) — Phase 8 (patient care) and
Phase 9 (storefront/loyalty) extend this same table with vitals/care-plan links, loyalty
points, addresses, etc., rather than creating parallel tables, per BLUEPRINT.md §28's "every
Patient is a Customer."

## Decisions & trade-offs
- **`SaleItem` is per-batch, not per-cashier-line.** The cashier enters "Paracetamol × 5"
  once; if FEFO splits that across two batches (3 from the batch expiring sooner, 2 from the
  next), `createSale` writes two `SaleItem` rows, one per batch actually touched. This keeps
  `SaleItem` aligned 1:1 with the `StockMovement` rows it caused — deliberate, not an
  oversight — and is what makes an eventual refund/void implementation able to reverse the
  exact batches a sale drew from, rather than guessing.
- **Discount is attached only to the first split row** for a given cashier-entered line, with
  0 on any subsequent rows from the same FEFO split, so a discount never gets counted more
  than once when multiple `SaleItem` rows exist for what was logically one line.
  `subtotal`/`discountTotal`/`total` on the `Sale` itself are still computed from the
  cashier-entered lines directly, not by re-summing `SaleItem` rows, so this apportionment
  choice can't skew the sale's own totals even if it looks slightly arbitrary at the line
  level.
- **`taxTotal` is hard-coded to 0.** `Product.taxConfig` exists in the schema (Phase 2) but no
  tax-calculation logic has been written — that's real logic to design (Ghana VAT/NHIL/GETFund
  rules, exemptions for medicines), not something to fake with a placeholder formula.
- **Minimum-selling-price enforcement is a hard block, not an approval-with-override.**
  BLUEPRINT.md §9 flags "product sold below minimum margin" as a *critical alert* rather than
  a hard stop, which implies an authorized override should exist. Phase 3 only builds the
  block; the override (likely a manager PIN/approval, tied into the same approvals inbox as
  Phase 4's discount/adjustment approvals) is a natural Phase 4 addition, not invented here.
- **No void/refund workflow yet** (BLUEPRINT.md §41). This is a meaningfully different
  feature — reversing specific batch deductions, choosing a disposition (saleable/quarantine/
  damaged/disposal) for returned medicine — not just "negative sale," and deserves its own
  pass rather than a rushed addition here.
- **No offline sync queue yet** (BLUEPRINT.md §50). The POS page assumes it's online; Firestore
  offline persistence + a sync-back Cloud Function is real, separate work.
- **POS branch selection is manual**, not auto-detected from the cashier's assigned branch —
  reading that requires the Firestore `users/{uid}` mirror doc (written by
  `computeAndSyncClaims` since Phase 0), which the web app doesn't read from yet. Small,
  legitimate follow-up, not deferred for a hard reason.
- **Checkout only supports a single cash payment**, not the split-payment UI (BLUEPRINT.md
  §37's "GH₵100 Cash + GH₵250 MoMo" example) — the `createSale` function already accepts
  multiple payments and validates they sum to the total; only the UI is simplified for now.

## Known issues / follow-ups
- **Nothing in this phase has been run against a real database.** Verified so far: schema
  generates and `tsc` builds clean across `db`/`functions`/`web`; all 17 Cloud Functions
  (Phases 0-3 combined) load in the Functions emulator; `/pos` correctly redirects an
  unauthenticated visitor to `/login` in an actual browser with zero console errors. The real
  test — does a sale actually deduct the right batches, does `closeTill`'s variance
  calculation match manual arithmetic, does a payments-total mismatch actually get rejected —
  needs a live Supabase project. This is the second consecutive phase built on the same
  unverified ledger foundation from Phase 2; strongly worth doing a live end-to-end test soon
  rather than continuing to stack unverified phases indefinitely.
- No void/refund, no offline queue, no receipt rendering/printing, no split-payment UI (see
  Decisions above for why each was deliberately left out rather than half-built).
  Non-cash payment methods that need a `referenceNumber` (MoMo/card) aren't exposed in the UI.
- POS branch selection should switch to reading the cashier's assigned branch from the
  Firestore mirror doc instead of a manual dropdown.

## How to verify this phase
Once real Supabase/Firebase credentials exist and a test org/branch/cashier/product/stock
exists (per Phase 0-2 verification steps):
1. Sign in as a cashier at `/pos`, select the branch, open a till with an opening float
2. Add a product to the cart, complete the sale, confirm the returned `sale.total` matches
   the cart total
3. Confirm in Prisma Studio: correct `SaleItem` row(s) created (matching the batch FEFO should
   have picked), `StockMovement` rows with `movementType: SALE` and `referenceId` pointing at
   the sale, and `BranchStock.quantityOnHand` reduced correctly
4. Close the till with a `closingActual` equal to opening float + the sale's cash amount —
   confirm `variance` is 0; try a mismatched actual and confirm variance is non-zero and correct
5. Try a sale with `payments` not summing to the total — confirm it's rejected before anything
   is written (query `Sale`/`StockMovement` to confirm nothing was created)
6. Try a `unitPrice` below a product's `minSellingPrice` — confirm `createSale` rejects it
