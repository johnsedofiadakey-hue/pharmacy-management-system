# Phase 7 — Prescriptions & Pharmacist Workspace

**Status:** Scaffolded — intake, pharmacist review with substitution, restricted-medicine POS gating, and UI all built; pending live Supabase/Firebase verification
**Date:** 2026-07-08
**Corresponds to:** BLUEPRINT.md § Phase 7

## Goal recap
A customer's prescription gets logged, a pharmacist reviews and (optionally) substitutes
unavailable items, and the approved prescription gates the actual POS sale of any restricted
medicine — closing the loop the exit criteria asks for: "customer uploads a prescription,
pharmacist reviews/approves, linked to a completed POS sale."

## What was built
- Schema: `Prescription` (full 10-status enum from the blueprint), `PrescriptionItem`
  (`productId` nullable until matched, `availabilityStatus` enum, `note`), and `Sale.prescriptionId`
- `createPrescription` — staff-entered intake (see Decisions); `PRESCRIPTIONS:CREATE`
  scoped to branch; upserts the customer by phone, same pattern as `createSale`
- `listPrescriptions` — branch-scoped, optional `pendingOnly` filter (RECEIVED/UNDER_REVIEW/
  CLARIFICATION_REQUIRED); `PRESCRIPTIONS:VIEW`
- `reviewPrescription` — the pharmacist review step; `PRESCRIPTIONS:APPROVE` (only
  `superintendent_pharmacist` holds this in the seed). Setting an item's `productId` to
  something other than what `requestedText` implies **is** the substitution decision —
  recorded via `reviewedByPharmacistId`/`reviewedAt` on the prescription itself, with no
  separate substitution-request entity
- **`createSale` (Phase 3) now gates restricted medicine**: any line whose product is
  `prescriptionClassification: RESTRICTED` requires a `prescriptionId` on the sale pointing at
  an `APPROVED`/`PARTIALLY_AVAILABLE` prescription that actually lists that product as
  available; the prescription is marked `COMPLETED` when the sale succeeds, in the same
  transaction
- `/branch/pharmacist` — prescription intake form + pending-review queue with per-item
  product-matching/availability controls and approve/reject/request-clarification actions

## Stack & tools used in this phase
No new dependencies.

## Key files / entry points
- `packages/db/prisma/schema.prisma` — `Prescription`, `PrescriptionItem`,
  `PrescriptionStatus`, `PrescriptionItemAvailability`, `Sale.prescriptionId`
- `packages/db/prisma/seed.ts` — `pharmacy_technician` gained `PRESCRIPTIONS:CREATE`
  (previously view-only) so intake isn't locked to the pharmacist role alone
- `functions/src/prescriptions/createPrescription.ts`, `listPrescriptions.ts`,
  `reviewPrescription.ts`
- `functions/src/pos/createSale.ts` — restricted-medicine gate added
- `apps/web/src/app/branch/pharmacist/page.tsx`

## Data model changes
Added `Prescription`, `PrescriptionItem`, their enums, and `Sale.prescriptionId`.

## Decisions & trade-offs
- **Intake is staff-entered, not customer self-upload.** There's no public storefront yet
  (that's Phase 9) for a customer to upload their own prescription photo/PDF — so this phase
  models the equally real "walk-in with a paper prescription, staff logs what's on it" flow.
  `uploadedFileUrl` exists on the schema already (nullable) for when Phase 9 adds the actual
  file-upload path; it's the same `Prescription` record either way, just a different entry
  point, so nothing here needs to change when that's built.
- **No separate substitution-request entity.** BLUEPRINT.md §13 wants "pharmacist reviews,
  approves or rejects, decision is logged" for substitutions — that's exactly what
  `reviewPrescription` already does for every item, substituted or not. Modeling substitution
  as a distinct workflow would duplicate the same gate (`PRESCRIPTIONS:APPROVE`) and the same
  audit fields (`reviewedByPharmacistId`/`reviewedAt`) that already exist.
  A pharmacist choosing `productId: X` when `requestedText` says "brand Y" simply *is* the
  substitution, logged by construction.
- **Restricted-medicine gating lives inside `createSale`, not as a separate pre-check
  endpoint.** The alternative (a `canSellRestrictedItem` function the POS UI calls first) would
  create a race condition between the check and the actual sale; keeping the gate inside the
  same transaction that deducts stock is the only way to guarantee no restricted item is ever
  actually sold without a valid, approved prescription covering it at that exact moment.
- **Intermediate statuses `READY_FOR_PAYMENT`/`PREPARING`/`READY_FOR_COLLECTION` exist in the
  enum but have no transition function yet.** Those make sense for the online-order fulfilment
  flow (Phase 9: pick, prepare, notify customer for collection) where payment and dispensing
  are separate moments in time. For in-person POS dispensing, payment and handover happen in
  one transaction, so this phase's path goes straight from `APPROVED`/`PARTIALLY_AVAILABLE` to
  `COMPLETED` via the sale. Keeping the full enum now avoids a future migration just to add the
  values Phase 9 will actually drive through.
- **`reviewPrescription`'s overall-status derivation is a simple rule**: all items `AVAILABLE`
  → `APPROVED`; at least one `AVAILABLE`/`PARTIALLY_AVAILABLE` → `PARTIALLY_AVAILABLE`;
  otherwise `REJECTED` (unless the pharmacist explicitly chose `REJECT`/`REQUEST_CLARIFICATION`,
  which always wins). This is a reasonable default, not a clinical judgment the software is
  making — the pharmacist sets every item's availability themselves before this rule runs.

## Known issues / follow-ups
- **Nothing in this phase has been run against a real database.** Verified so far: schema
  generates, all packages build clean, all 40 Cloud Functions (Phases 0-7 combined) load in
  the emulator, and `/branch/pharmacist` correctly redirects an unauthenticated visitor with
  zero console errors in an actual browser. This is now the sixth consecutive phase stacked on
  the same unverified foundation — the restricted-medicine gate in particular (a real
  regulatory-adjacent control) deserves live end-to-end testing before this goes anywhere near
  production use.
- No customer self-upload path yet (Phase 9).
- No adverse-reaction reporting or drug-recall integration with prescriptions yet (Phase 11).
- POS UI (`/pos`) doesn't yet have a way to attach a `prescriptionId` to a sale — the
  `createSale` function supports it, but the checkout form doesn't expose a prescription
  picker. Needed before the restricted-medicine gate is actually usable end-to-end from the
  cashier's screen, not just via direct function calls.
- **Final workflows must be validated against current Ghanaian pharmacy law and professional
  guidance before production** (BLUEPRINT.md §27's own explicit caveat) — nothing in this phase
  should be taken as a compliance sign-off.

## How to verify this phase
Once real Supabase/Firebase credentials exist:
1. Log a prescription for a customer with one item matching a `RESTRICTED` product and one
   matching an `OTC` product
2. As the superintendent pharmacist, review it: match the restricted item to a product, set
   `AVAILABLE`, approve — confirm prescription status becomes `APPROVED`
   (or `PARTIALLY_AVAILABLE` if you leave a different item `UNAVAILABLE`)
3. Attempt `createSale` for the restricted product **without** a `prescriptionId` — confirm it's
   rejected with `failed-precondition`
4. Attempt it again **with** the approved `prescriptionId` — confirm it succeeds, the sale
   deducts stock correctly, and the prescription's status becomes `COMPLETED`
5. Try selling a restricted item against a prescription that doesn't actually list that
   product as available — confirm it's rejected
