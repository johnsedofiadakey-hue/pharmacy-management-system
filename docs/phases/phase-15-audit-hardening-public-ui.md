# Phase 15 — Audit Hardening & Public UI

**Status:** Built and locally verified — backend safety fixes, public marketing site, branch-aware entry, and clinical visual refresh are complete; pending live Paystack secret/webhook and live end-to-end checkout retest.
**Date:** 2026-07-09
**Corresponds to:** Production hardening and public experience after BLUEPRINT.md Phase 14

## Goal recap
Turn the project from a functional internal system into a safer, more trustworthy public-facing pharmacy platform. This phase responds to the full audit: tighten tenant and stock safety, reduce duplicate-sale risk, improve payment timing, and rebuild the UI so customers, staff, pharmacists, and managers enter through a professional health-system experience.

## What was built
- Rebuilt the root page as a public `Nexus Pharma` site with a real health-care hero image, product/service sections, delivery messaging, and a partially visible universal login/branch gateway below the footer.
- Added a `PublicBranchEntry` component that loads public branches, lets users choose a branch, and stores the selected branch for the storefront checkout.
- Refreshed global UI tokens around teal, deep blue, white, and green accents to communicate trust, safety, reliability, and clinical calm.
- Restyled the storefront, login, customer login/signup, admin shell, branch shell, POS shell, and key dashboard/POS surfaces with shared `clinical-card`, `field`, and button classes.
- Added storefront fallback states for empty/unavailable catalogues and public-safe error copy.
- Tightened `requirePermission` so branch-scoped checks can also validate the caller's organisation and reject cross-tenant branch access.
- Made stock balance updates atomic in the inventory ledger to reduce concurrent oversell and stale-balance risk.
- Added POS idempotency through `Sale.clientSaleId` and a unique `(branchId, clientSaleId)` constraint.
- Moved online loyalty awards from order placement to successful Paystack verification.
- Added stock restoration when a verified Paystack payment fails after stock was reserved.
- Added transfer guards so dispatch/receive quantities cannot exceed requested/sent quantities.
- Reworked `syncUserClaims` so it verifies permissions from Postgres instead of trusting stale custom claims.
- Updated Firebase predeploy steps so the vendored database package is rebuilt before Functions deploy.

## Stack & tools used in this phase
- Next.js App Router and Tailwind CSS v4.
- Firebase Auth/Functions callable client.
- Firebase Functions TypeScript business logic.
- Supabase Postgres via Prisma.
- In-app browser verification for desktop and mobile responsive checks.

## Key files / entry points
- `apps/web/src/app/page.tsx`
- `apps/web/src/components/PublicBranchEntry.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/app/store/page.tsx`
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/store/login/page.tsx`
- `apps/web/src/app/store/signup/page.tsx`
- `functions/src/lib/permissions.ts`
- `functions/src/inventory/ledger.ts`
- `functions/src/pos/createSale.ts`
- `functions/src/storefront/paystack.ts`
- `functions/src/storefront/placeOrder.ts`
- `functions/src/auth/syncUserClaims.ts`
- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/20260709093000_sale_idempotency/migration.sql`
- `firebase.json`

## Data model changes
- Added nullable `Sale.clientSaleId`.
- Added unique index `sales_branchId_clientSaleId_key` on `(branchId, clientSaleId)`.

This gives offline POS retries and shaky network submissions a stable client-generated idempotency key without changing existing sales rows.

## Decisions & trade-offs
- **Firebase remains the real-time/auth/function layer; Supabase remains the relational source of truth.** This keeps the system upgradeable without forcing Firebase to handle relational pharmacy data it is not best suited for.
- **Public branch selection is remembered locally first.** It improves the customer journey now, while still allowing future server-side tenant/branch routing.
- **The public site uses a real health-care background image, not a decorative illustration.** For a pharmacy product, trust and recognizability matter more than abstract polish.
- **Paystack verification is still callable-led.** This phase improves payment timing and stock restoration, but a signed Paystack webhook is still required before production-scale money movement.
- **The Functions predeploy now runs `pnpm install`.** It is heavier than ideal, but it keeps the local file dependency for the vendored database package fresh before deploy. A cleaner future step is a dedicated deploy script that vendors and installs in a controlled order.

## Known issues / follow-ups
- Add a signed Paystack webhook for unattended reconciliation.
- Add scheduled cleanup for unpaid abandoned orders so reserved stock is released even when no callback/verification occurs.
- Add refund/void workflows for both POS and online payments.
- Consider Firebase App Check and rate limiting on public callables.
- Live Paystack testing still needs the account owner's test secret key.
- Branch choice is now used by the storefront; future staff dashboards should also auto-default to the selected/assigned branch where that improves workflow.
- Replace the remote hero image with a locally owned production asset before final launch if licensing/control is a concern.

## Verification completed
- Applied live Supabase migration `20260709093000_sale_idempotency`.
- Ran `pnpm --filter @pharmacy-os/db generate`.
- Ran `pnpm --filter @pharmacy-os/db build`.
- Ran `npm --prefix functions run vendor-db`.
- Ran `pnpm install` to refresh the local file dependency.
- Ran `pnpm --filter functions build`.
- Ran `pnpm -r build` successfully after the UI rebuild.
- Started the Next.js app locally at `http://127.0.0.1:3000`.
- Verified `/`, `/store`, and `/login` in the browser.
- Verified mobile width `390px` for `/`, `/store`, and `/login`; no horizontal overflow was detected.
- Confirmed the public hero image renders, the home page shows a next-section hint below the first viewport, the branch/login gateway appears below the footer, and storefront/login routes render without layout overflow.

## How to verify this phase live
1. Deploy the updated web app and Functions.
2. Confirm the public home page loads on the Firebase Hosting URL.
3. Confirm branch selection loads real branches and persists into `/store`.
4. Sign in as staff and verify admin/branch/POS shells still route correctly.
5. Create an offline POS retry with the same `clientSaleId` and confirm only one sale is stored.
6. Complete a Paystack test payment and confirm loyalty points are awarded only after verified payment success.
7. Force a failed Paystack verification on a reserved order and confirm stock is restored.
8. Run concurrent stock movement tests against the same branch/product/batch and confirm balances cannot go negative.
