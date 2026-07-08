# Phase 14 — Paystack Payments & Live Readiness

**Status:** Scaffolded and built — Supabase migration applied live; Firestore rules deployed; Functions blocked in `FAILED` state by Google Cloud Build service-account IAM; pending Paystack secret key and real Paystack test checkout
**Date:** 2026-07-08
**Corresponds to:** Production hardening after BLUEPRINT.md Phase 13

## Goal recap
Turn Phase 9 checkout from manual payment selection into a real online payment path for Ghana-market customers, starting with Paystack while keeping the data model open for future providers.

## What was built
- Added `PaymentProvider` with `MANUAL` and `PAYSTACK`.
- Extended `OrderPayment` with provider reference, access code, checkout URL, provider status, raw provider response, `paidAt`, and `updatedAt`.
- Added `initializePaystackPayment` callable for customer-owned orders.
- Added `verifyPaystackPayment` callable for customer callback/payment-status checks.
- Updated storefront checkout to support Mobile Money, Card, Bank Transfer, and Cash.
- Updated customer account page to verify Paystack callbacks via the returned `reference` query parameter.
- Added `functions/.env.example` for production runtime configuration.
- Updated the production readiness checklist.
- Created live starter organisation `Nexus Pharma`, central warehouse, and `Main Branch` in Supabase for single-org storefront testing.

## Stack & tools used in this phase
- Firebase Cloud Functions callable APIs.
- Supabase Postgres via Prisma.
- Paystack Transaction API.
- Next.js customer storefront/account pages.

## Key files / entry points
- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/20260708213000_paystack_payments/migration.sql`
- `functions/src/storefront/paystack.ts`
- `functions/src/storefront/initializePaystackPayment.ts`
- `functions/src/storefront/verifyPaystackPayment.ts`
- `functions/src/index.ts`
- `apps/web/src/app/store/page.tsx`
- `apps/web/src/app/store/account/page.tsx`
- `apps/web/src/lib/firebase/callables.ts`
- `functions/.env.example`
- `docs/PRODUCTION_READINESS_CHECKLIST.md`

## Data model changes
`OrderPayment` remains the payment source of truth. Paystack is treated as a payment rail: the app stores the gateway reference and current provider status, then only marks the local payment `PAID` after verifying the Paystack transaction amount, currency, and status.

## Decisions & trade-offs
- **Cash remains manual.** Paystack is only used for card, mobile money, and bank transfer.
- **Verification is callable first, webhook later.** The customer callback can verify payment now, but unattended reconciliation should still add a Paystack webhook before production money moves at scale.
- **Provider-neutral fields were used.** The schema can support Hubtel, Flutterwave, or insurer settlement later without a separate payment table.
- **Functions read `PAYSTACK_SECRET_KEY` from runtime env.** The secret is never sent to the browser.
- **Orders are confirmed after successful payment verification.** Cash/manual orders stay in the existing manual fulfilment path.

## Known issues / follow-ups
- No Paystack webhook yet.
- No refund/void workflow yet.
- No payment reconciliation dashboard yet.
- Live Paystack test checkout is pending a test secret key.
- Firebase Functions uploaded but all functions currently report `state: FAILED` because Cloud Build lacks required build service-account permissions.
- Firebase Storage rules were not deployed because Storage has not been initialized in the Firebase Console.

## Verification completed
- Applied live Supabase migration `20260708213000_paystack_payments`.
- Ran `pnpm --filter @pharmacy-os/db generate`.
- Ran `pnpm --filter @pharmacy-os/db build`.
- Ran `pnpm --filter functions build`.
- Ran `pnpm --filter web build`.
- Applied live Supabase migration `20260708213000_paystack_payments`.
- Created live starter organisation `da80f9bb-ba2a-4ecc-944f-ad8057035a8b`.
- Deployed Firestore rules and indexes to Firebase project `nexuspharmasystem`.

## Live deployment blockers
- `firebase deploy --only storage` failed because Firebase Storage has not been set up in the console yet.
- `firebase deploy --only functions` uploaded source and loaded `functions/.env`, but every function ended in `state: FAILED`. The deploy error was:
  `Could not build the function due to a missing permission on the build service account.`
- Google documents this as a Cloud Build service-account permission issue; the build service account needs access to read the source bucket and read/write Artifact Registry, commonly by granting the default Compute Service Account `roles/cloudbuild.builds.builder` or using a custom build service account.

## How to verify this phase live
1. Fix Firebase Storage setup in the console, then deploy Storage rules.
2. Fix Google Cloud Build service-account IAM, then redeploy Functions.
3. Add Paystack test `PAYSTACK_SECRET_KEY` to `functions/.env` or the chosen Functions secret/env mechanism.
4. Create/link a customer account with an email address.
5. Add stock for a non-restricted product.
6. Place a storefront order using Mobile Money, Card, or Bank Transfer.
7. Confirm the browser redirects to Paystack.
8. Complete a Paystack test payment.
9. Confirm the callback returns to `/store/account?reference=...`.
10. Confirm `verifyPaystackPayment` marks the `OrderPayment` as `PAID` and the `Order` as `CONFIRMED`.
