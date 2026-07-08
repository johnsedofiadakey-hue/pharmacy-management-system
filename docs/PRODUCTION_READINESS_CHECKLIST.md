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
- [ ] Set `NEXT_PUBLIC_ORGANISATION_ID` for the storefront (single-org deployment — see
      Phase 9 build log on why this is a manual value, not resolved from a domain)
- [ ] Run `pnpm db:migrate` — this generates and applies the **first ever migration**, since
      no migration has been run against a live database at any point in this project's build
- [ ] Run `pnpm db:seed` — populates the permission grid and default roles
- [ ] Deploy Cloud Functions: `firebase deploy --only functions`
- [ ] Deploy Firestore rules/indexes and Storage rules: `firebase deploy --only firestore,storage`
- [ ] Create the first Super Admin user and organisation manually (via Prisma Studio or a
      one-off script) — there's no self-service "create my organisation" flow yet, by design
      (this project builds *inside* one organisation, not a SaaS signup — see BLUEPRINT.md §55
      and Phase 13)

## Live end-to-end verification (do this before anything else below)

Every phase log (`docs/phases/phase-0-*.md` through `phase-13-*.md`) ends with a "How to
verify this phase" section written specifically for this moment — this project has been built
and reviewed entirely through static analysis, `tsc` builds, emulator load tests, and
browser-preview redirect checks, with **zero** live-database verification at any point.
Work through each phase's verification steps in order (they build on each other — Phase 3's
sale flow depends on Phase 2's ledger being correct, Phase 9's checkout depends on Phase 3's
FEFO deduction, etc.) before trusting any of it in front of a real user.

## Known gaps to close before real usage (not just "nice to have")

- [ ] **Payment gateway** — `OrderPayment`/checkout currently default to `CASH` with no real
      MoMo/card processor integration (Phase 9). Pick a Ghana-market gateway (Paystack,
      Flutterwave, or direct MTN MoMo API) and wire a real `confirmOrderPayment` webhook
      handler before accepting online prepayment.
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
