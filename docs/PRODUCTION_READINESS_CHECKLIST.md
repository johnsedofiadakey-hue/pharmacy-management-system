# Production Readiness Checklist

Living checklist — update it as items are completed rather than treating this as a one-time
document. See [BLUEPRINT.md](../BLUEPRINT.md) and `docs/phases/` for the full build history
behind each item.

## Infrastructure setup (blocking — nothing below this works without it)

- [ ] Create the real Firebase project (console.firebase.google.com), enable Auth
      (Email/Password), Firestore, Storage, Cloud Functions
- [ ] Create the real Supabase project, note the pooled (`DATABASE_URL`) and direct
      (`DIRECT_URL`) connection strings
- [ ] Fill in `packages/db/.env` with real Supabase credentials
- [ ] Fill in `.firebaserc` with the real Firebase project ID
- [ ] Fill in `apps/web/.env.local` with the real Firebase web app config
- [ ] Fill in `functions/.env` (local/deploy-time, gitignored) with the runtime
      `DATABASE_URL` and `PAYSTACK_SECRET_KEY`; do **not** use `DIRECT_URL` in deployed
      Functions
- [ ] Set `NEXT_PUBLIC_ORGANISATION_ID` for the storefront (single-org deployment — see
      Phase 9 build log on why this is a manual value, not resolved from a domain)
- [x] Run live Prisma migrations against Supabase
- [x] Run `pnpm db:seed` — populates the permission grid and default roles
- [x] Deploy Cloud Functions: `firebase deploy --only functions`
      - Fixed 2026-07-08: granted `roles/cloudbuild.builds.builder` to the Compute Engine
        default service account (`618493796419-compute@developer.gserviceaccount.com`) —
        Google's documented fix for the `state: FAILED` / "missing permission on the build
        service account" error.
      - That unblocked the build but exposed a real bug: Cloud Build runs plain `npm install`
        remotely and doesn't understand pnpm's `workspace:*` protocol, so
        `@pharmacy-os/db: workspace:*` failed with `npm error code EUNSUPPORTEDPROTOCOL`.
        Fixed by vendoring a self-contained copy of the built `@pharmacy-os/db` package into
        `functions/vendor/pharmacy-os-db` (via `functions/scripts/vendor-db.js`, run as a
        `predeploy` step in `firebase.json`) and depending on it via `file:./vendor/pharmacy-os-db`,
        which plain npm resolves natively.
      - Also added `debian-openssl-3.0.x` to the Prisma `binaryTargets` in
        `packages/db/prisma/schema.prisma` (alongside `native`) — the generated client only
        shipped a macOS query engine before, which would have failed at runtime on the
        Ubuntu-based Cloud Functions Node 20 image even once the build succeeded.
      - All ~85 functions deployed successfully on 2026-07-08 (`firebase functions:list`
        confirms `v2`/`nodejs20`/`us-central1` for each).
- [x] Deploy Firestore rules/indexes and Storage rules
      - Firestore rules/indexes deployed 2026-07-08.
      - Storage initialized 2026-07-08 via the Firebase console "Get started" wizard
        (default bucket `gs://nexuspharmasystem.firebasestorage.app`, regional/no-cost
        location US-EAST1, started in production/deny-by-default mode). `storage.rules`
        deployed immediately after with `firebase deploy --only storage`.
- [x] Create the first Super Admin user and organisation manually (via Prisma Studio or a
      one-off script) — there's no self-service "create my organisation" flow yet, by design
      (this project builds *inside* one organisation, not a SaaS signup — see BLUEPRINT.md §55
      and Phase 13)
      - Done 2026-07-08: Firebase Authentication had never been initialized either (same
        "Get started" gap as Storage) — enabled it and turned on the Email/Password sign-in
        provider.
      - Discovered the Cloud Functions runtime service account
        (`618493796419-compute@developer.gserviceaccount.com`) also had zero Firebase Admin
        permissions beyond the earlier Cloud Build grant — every deployed function that calls
        `auth.createUser`/`setCustomUserClaims`/Firestore admin writes would have failed at
        runtime. Granted `roles/firebaseauth.admin` and `roles/datastore.user`.
      - Added a temporary, self-guarding `bootstrapSuperAdmin` callable (refuses to run once
        the target organisation has any user), invoked it once for `johnsedofiadakey@gmail.com`
        / Nexus Pharma, confirmed the `User` + `UserRole(super_admin)` rows and custom claims
        were created correctly, then deleted the function from the deployment.
      - Verified live: `/login` in the actual web app round-trips to
        `identitytoolkit.googleapis.com` against the real `nexuspharmasystem` project and
        correctly rejects a wrong password for the real account (`auth/invalid-credential`),
        confirming the account and wiring are live. The account owner still needs to set their
        password via the generated Firebase password-reset link before signing in for real.

## Live end-to-end verification (do this before anything else below)

Every phase log (`docs/phases/phase-0-*.md` through `phase-13-*.md`) ends with a "How to
verify this phase" section written specifically for this moment — this project has been built
and reviewed mostly through static analysis, `tsc` builds, emulator load tests, and
browser-preview redirect checks. Supabase migration/seed has now been verified live, but the
business workflows still need live Firebase Auth/Functions verification. Work through each
phase's verification steps in order (they build on each other — Phase 3's sale flow depends on
Phase 2's ledger being correct, Phase 9's checkout depends on Phase 3's FEFO deduction, etc.)
before trusting any of it in front of a real user.

## Known gaps to close before real usage (not just "nice to have")

- [ ] **Payment gateway live verification** — Paystack initialization/verification is wired for
      storefront orders, but a Paystack test secret key still needs to be configured in
      Functions and a real sandbox checkout needs to be completed. Add a Paystack webhook before
      relying on unattended payment reconciliation.
      - Deliberately deferred 2026-07-09: getting the `sk_test_...` key requires signing into
        the Paystack dashboard, which needs the account owner — not something an agent can do.
        Once you have the key, drop it into `functions/.env` as `PAYSTACK_SECRET_KEY` and
        redeploy (`firebase deploy --only functions`), then place a real storefront order with
        Mobile Money/Card/Bank Transfer to confirm the full round trip (see
        docs/phases/phase-14-paystack-payments-live-readiness.md "How to verify this phase
        live").
- [ ] **Notification delivery** — staff invite links (Phase 1) and drug recall notices
      (Phase 11) are generated but never sent anywhere; the UI just displays them for manual
      copy/share. Wire an email/SMS/WhatsApp provider before relying on either workflow.
- [ ] **Void/refund workflow** — deliberately deferred since Phase 3. Several Phase 11
      suspicious-activity checks (voided-transaction frequency, repeated refunds) can't run
      until this exists.
- [ ] **Legal/regulatory sign-off** — BLUEPRINT.md §27 says explicitly: "final workflows must
      be validated against current Ghanaian pharmacy law and professional guidance before
      production." Nothing about the restricted-medicine gate, prescription workflow, or NHIS
      scaffold in this codebase should be treated as compliance-approved.
- [ ] **Rider/staff picker UX** — several admin flows (delivery rider assignment, drug recall
      batch selection) currently take a raw database ID typed into a text box, not a proper
      search/picker. Functionally correct, just not production-grade UX.

## Security

- [x] Firestore rules reviewed — deny-by-default, narrow exceptions only
      (`users/{uid}` self-read, `branch_live/{branchId}` org-scoped read)
- [x] Storage rules reviewed — deny-all (nothing uses Storage yet; `Prescription.uploadedFileUrl`
      exists on the schema but no upload path has been built)
- [x] All ~85 Cloud Functions scanned for missing authorization — every one either calls
      `requirePermission`/`requirePermissionAnyBranch`/`getCallerCustomer`, or is a
      documented-intentional public endpoint (the `public*` storefront functions),
      or uses a differently-shaped but real check (`linkCustomerAccount`'s bootstrap check,
      `clockIn`/`clockOut`'s ownership checks, `syncUserClaims`'s self-or-admin check)
- [x] No raw SQL (`$queryRaw`/`$executeRaw`) anywhere — every query goes through Prisma's
      parameterized query builder
- [x] No hardcoded secrets/API keys found in a repo-wide scan
- [x] Public-facing functions checked for data leakage — `publicListProducts` excludes cost/
      supplier data; `publicCheckBranchAvailability` returns a stock-level bucket, not exact
      quantities; customer-facing list functions (`listMyOrders`, `listMyAddresses`) scope
      strictly to the caller's own `customerId`
- [ ] Consider Firebase App Check once real traffic exists, to reduce abuse of callable
      function endpoints from outside the actual app
- [ ] Consider rate-limiting sensitive actions (login attempts, sale creation frequency) —
      Cloud Functions has baseline DDoS protection but no application-level throttling has
      been added

## Performance

- [ ] **Nothing has been load-tested** — there's no real data volume to test against yet.
      Added forward-looking indexes this phase (`StockMovement(branchId, createdAt)`,
      `StockMovement(batchId)`, `Sale(branchId, status, createdAt)`,
      `Order(branchId, status, createdAt)`, `SaleItem(batchId)`) based on the query patterns
      Phase 10/11's reports actually use, but revisit with real `EXPLAIN ANALYZE` output once
      there's production-scale data.
- [ ] Reports (Phase 10) compute multi-dimensional breakdowns in application code rather than
      SQL aggregation — fine at expected single-chain scale, revisit if it's ever slow
- [ ] Supabase connection pooling (Supavisor, transaction mode) is configured per Phase 0 —
      confirm actual concurrent Cloud Function instance count stays within pool limits once
      deployed

## Offline & devices (Phase 12)

- [x] POS offline sales queue built (`apps/web/src/lib/offlineSalesQueue.ts`) — localStorage-
      backed, drains automatically on the browser `online` event; verified the underlying
      localStorage/`navigator.onLine` mechanics in a live browser preview. **Not** verified
      against an actual network interruption talking to a real backend (needs live
      credentials — see phase log)
- [x] Barcode scanner UX — search input auto-focuses, Enter-key exact-barcode-match adds
      straight to cart
- [x] Receipt printing via the browser's native print dialog + print-only CSS
- [ ] Cash drawer integration — **out of scope for a web app** without a specific hardware
      target (kick-drawer commands typically go through a receipt printer's own driver or a
      raw serial/USB connection.) Revisit only once a specific printer/drawer model is chosen
      to integrate against.
- [ ] Label printer support — not addressed; same reasoning as cash drawer, needs a concrete
      hardware target

## Monitoring & operations

- [ ] Set up Cloud Functions error alerting (Firebase Console → Functions → alerting, or
      export logs to a monitoring tool)
- [ ] Set up Supabase database monitoring/alerting (connection pool exhaustion, slow queries)
- [ ] Define a backup/point-in-time-recovery policy for the Supabase Postgres database
- [ ] Decide on a log-retention policy for `AuditLog` (Phase 11) — it currently grows
      unbounded with no archival/pruning strategy
