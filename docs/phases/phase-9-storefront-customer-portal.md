# Phase 9 — Storefront & Customer Portal

**Status:** Scaffolded — customer auth, public browsing, checkout with FEFO stock deduction, order fulfilment, and delivery tracking all built; real payment gateway deferred; pending live Supabase/Firebase verification
**Date:** 2026-07-08
**Corresponds to:** BLUEPRINT.md § Phase 9

## Goal recap
A customer places an online order, the branch fulfils it, and pickup/delivery is tracked to
completion — the last piece needed to close out the customer-facing gaps Phases 7 and 8
deliberately deferred (prescription self-upload, the patient portal).

## What was built
- Schema: `Customer.firebaseUid`/`loyaltyPoints`/`preferredBranchId`, `CustomerAddress`,
  `Order`/`OrderItem`/`OrderPayment`, `Delivery`, plus `ORDERS`/`DELIVERIES` added to the
  `PermissionResource` enum (a gap flagged all the way back in Phase 0's seed comments —
  closed now that the tables actually exist)
- **`getCallerCustomer`** — a customer-facing auth path, parallel to staff's `getCallerUser`,
  resolving a Firebase uid to a `Customer` row. Customer-facing functions never call
  `requirePermission` — the resource/action matrix is a staff concept; a customer is
  authorized by *owning* the data (their own orders, their own addresses), not a role grant
- **`linkCustomerAccount`** — ties a freshly-signed-up Firebase Auth user to a `Customer` row,
  either creating one or attaching to an existing phone-only record from a past in-store visit
- `publicListProducts` / `publicListBranches` / `publicCheckBranchAvailability` — genuinely
  unauthenticated storefront browsing endpoints
- `placeOrder` — customer checkout: server-side pricing (never trusts a client-supplied unit
  price, unlike POS's `createSale`), blocks `RESTRICTED` products outright, deducts stock via
  the same `deductStockFefo` engine as POS, awards loyalty points, and creates a `Delivery`
  record for delivery orders
- `listMyOrders` / `listMyAddresses` / `addCustomerAddress` — customer portal
- `listBranchOrders` / `updateOrderStatus` (forward-only transition map) / `assignDeliveryRider`
  / `updateDeliveryStatus` (rider-self-or-manager gated) — staff-side fulfilment
- UI: public `/store` (browse + cart + checkout), `/store/signup`, `/store/login`,
  `/store/account` (order history + addresses), staff `/branch/orders` (fulfilment + delivery)

## Stack & tools used in this phase
No new dependencies. First phase with two distinct Firebase Auth populations (staff vs.
customers) sharing one project.

## Key files / entry points
- `packages/db/prisma/schema.prisma` — `CustomerAddress`, `Order`, `OrderItem`,
  `OrderPayment`, `Delivery`, `ORDERS`/`DELIVERIES` permission resources, and the
  `StockMovement.performedByCustomerId` fix (see Decisions)
- `packages/db/prisma/seed.ts` — `ORDERS`/`DELIVERIES` grants added across
  `branch_manager`, `regional_manager`, `head_office_admin`, `cashier`, `pharmacy_technician`,
  and `delivery_rider` (whose Phase 0 placeholder `CUSTOMERS:VIEW` grant is now replaced with
  the real resources)
- `functions/src/lib/customerAuthContext.ts` — `getCallerCustomer`
- `functions/src/storefront/` — `linkCustomerAccount.ts`, `publicListProducts.ts`,
  `publicListBranches.ts`, `publicCheckBranchAvailability.ts`, `placeOrder.ts`,
  `listMyOrders.ts`, `addCustomerAddress.ts`, `listMyAddresses.ts`
- `functions/src/orders/` — `listBranchOrders.ts`, `updateOrderStatus.ts`,
  `assignDeliveryRider.ts`, `updateDeliveryStatus.ts`
- `functions/src/inventory/ledger.ts`, `fefo.ts` — `performedByUserId`/`performedByCustomerId`
  now both optional (exactly one required at runtime)
- `apps/web/src/components/RequireAuth.tsx` — gained a `redirectTo` prop
- `apps/web/src/app/store/**`, `apps/web/src/app/branch/orders/page.tsx`

## Data model changes
Added `CustomerAddress`, `Order`, `OrderItem`, `OrderPayment`, `Delivery` and their enums.
Extended `Customer` with `firebaseUid`/`loyaltyPoints`/`preferredBranchId`. **Changed**
`StockMovement.performedByUserId` from required to optional, adding a new optional
`performedByCustomerId` (see Decisions — this is a real fix, not a scope addition).

## Decisions & trade-offs
- **Found and fixed a real bug while writing `placeOrder`**: it initially passed
  `customer.id` into `deductStockFefo`'s `performedByUserId`, which is a strict FK to `users`.
  A customer is never a row in `users` — this would have thrown a foreign-key violation the
  first time an online order actually ran against a real database. Fixed by making the ledger
  support two mutually-exclusive attributions: `performedByUserId` for staff-initiated
  movements (unchanged for every existing caller — receiveStock, adjustStock, createSale,
  transfers, receiveGoods, adjustment reviews all still pass a plain user id) and the new
  `performedByCustomerId` for customer-initiated ones. This is the second time in this project
  a schema gap only became visible by actually writing the consuming code (Phase 4's
  cross-org query bug was the first) — a reminder that "build it and see what breaks" catches
  real issues static review alone doesn't.
- **`placeOrder` deducts stock immediately at order placement**, not at some later "confirmed"
  step, even though BLUEPRINT.md §35 describes stock reservation as configurable ("Confirmed
  payment, Approved prescription, or Confirmed order"). A genuine reservation-without-a-ledger-
  entry concept would break the project's core invariant that `branch_stock` only ever changes
  via `applyStockMovement` — inventing a parallel "soft hold" mechanism outside the ledger was
  rejected in favor of keeping one honest system. The trade-off: an abandoned/unpaid online
  order still holds real stock until someone cancels it. Acceptable for now, revisit if
  abandoned-cart behavior becomes a real problem.
- **RESTRICTED products are blocked outright at storefront checkout**, not supported via
  online prescription attachment. Phase 7 built prescription review as a pharmacist workflow;
  extending it to a customer-facing "attach my prescription to this cart, wait for approval,
  then pay" flow is a meaningfully different, more complex feature that deserves its own design
  pass rather than a rushed bolt-on here.
- **No real MoMo/card payment gateway integration.** `OrderPayment.status` starts `PENDING` and
  there's no `confirmOrderPayment` function yet — same category of placeholder as Phase 1's
  invite-link email sending: the honest parts (order creation, stock deduction, payment record
  shape with a `providerReference` field ready for a real gateway's transaction ID) are built;
  the actual gateway API call requires real Paystack/Flutterwave/MTN MoMo credentials this
  project doesn't have. The storefront UI defaults every checkout to `CASH`
  (pay on pickup/delivery) as the only practically-usable path right now.
- **Customer-facing UI doesn't distinguish "signed in as staff" from "signed in as customer."**
  `RequireAuth` (extended with a `redirectTo` prop this phase, e.g. `/store/login` vs `/login`)
  only checks "is *some* Firebase user signed in" — a staff member visiting `/store/account`
  would pass the guard but then see empty/erroring data, since `getCallerCustomer` would find
  no linked `Customer` row for their uid. Not a security hole (the Cloud Function still
  correctly scopes by ownership), just a UX rough edge worth tightening later.
- **Order fulfilment statuses collapse `PRESCRIPTION_REVIEW`/`PHARMACIST_CHECK`** from the
  blueprint's full list — an order's `prescriptionId` (unused by `placeOrder` currently, since
  restricted items are blocked, but present on the schema) would link to a `Prescription` whose
  own status already tracks pharmacist review, rather than duplicating that state machine on
  `Order` too.
- **`organisationId` is a required param on customer-facing functions** (`linkCustomerAccount`,
  `publicListProducts`, etc.) rather than resolved from a subdomain/domain — there's no
  multi-tenant routing yet (Phase 13). A real single-org deployment sets
  `NEXT_PUBLIC_ORGANISATION_ID` at build time; verified in the browser that the storefront
  shows a clear configuration error rather than crashing when it's unset.

## Known issues / follow-ups
- **Nothing in this phase has been run against a real database.** Verified so far: schema
  generates, all packages build clean, all 61 Cloud Functions (Phases 0-9 combined) load in
  the emulator, and every new page (`/store`, `/store/signup`, `/store/account`,
  `/branch/orders`) renders/redirects correctly in an actual browser with zero console errors —
  including `/store` correctly surfacing the "not configured" error instead of crashing when
  `NEXT_PUBLIC_ORGANISATION_ID` is unset, which is the realistic state right now. This is the
  eighth consecutive phase stacked on the same unverified foundation, and this phase in
  particular introduces a second Firebase Auth population (customers) whose interaction with
  the existing staff-only claims-sync/permission system genuinely needs a live test.
- No real payment gateway (see Decisions) — `confirmOrderPayment` doesn't exist yet.
- No customer-side prescription upload/attachment at checkout (see Decisions).
- Rider assignment UI takes a raw user ID with no staff picker — needs a proper "select from
  delivery riders at this branch" dropdown.
- `RequireAuth` doesn't distinguish staff from customer sessions (see Decisions).
- No abandoned-order cleanup — stock deducted by an order that's never paid for stays deducted
  until someone manually cancels it (no automatic expiry/timeout).

## How to verify this phase
Once real Supabase/Firebase credentials exist and `NEXT_PUBLIC_ORGANISATION_ID` is set:
1. Sign up as a customer at `/store/signup` — confirm a `Customer` row is created/linked with
   the right `firebaseUid`
2. Browse `/store`, add an OTC product to cart, choose pickup, place the order — confirm stock
   deducts correctly (check `StockMovement.performedByCustomerId` is set, not
   `performedByUserId`), `Customer.loyaltyPoints` increases, and the order appears in
   `/store/account`
3. As staff, open `/branch/orders`, move the order through NEW → CONFIRMED → PICKING → READY →
   DELIVERED — confirm each transition is accepted and an invalid one (e.g. NEW → DELIVERED
   directly) is rejected
4. Place a delivery order, assign a rider, mark it delivered — confirm the `Delivery` record
   and `Order.status` both update correctly, and that a second staff user without
   `DELIVERIES:EDIT` can't update it unless they *are* the assigned rider
5. Attempt to add a `RESTRICTED` product to a storefront order — confirm `placeOrder` rejects
   it with a clear message
