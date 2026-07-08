# Phase 12 — Hardening, Devices, Offline & Launch Prep

**Status:** Scaffolded — offline POS queue, receipt print path, barcode-friendly POS UX, security/performance checklist, and production-readiness checklist built; pending live Supabase/Firebase verification
**Date:** 2026-07-08
**Corresponds to:** BLUEPRINT.md § Phase 12

## Goal recap
Full offline robustness review, device support planning, security review, performance review, and a launch-readiness checklist before the system is trusted in a real pharmacy.

## What was built
- `apps/web/src/lib/offlineSalesQueue.ts` — localStorage-backed queue for POS sales that fail because the browser is offline or the Cloud Function is temporarily unavailable
- POS queue draining in `apps/web/src/app/pos/page.tsx` — queued sales retry automatically when the browser fires the `online` event
- Barcode-scanner friendly POS search — search input auto-focuses, and Enter on an exact barcode match adds the product to the cart
- `apps/web/src/components/Receipt.tsx` — browser-printable receipt component with print-only CSS
- `docs/PRODUCTION_READINESS_CHECKLIST.md` — living launch checklist covering infrastructure, live verification, known blocking gaps, security, performance, offline/devices, monitoring, and deployment
- Forward-looking Prisma indexes added during hardening on the query patterns used by reports/compliance:
  - `StockMovement(branchId, createdAt)`
  - `StockMovement(batchId)`
  - `Sale(branchId, status, createdAt)`
  - `Order(branchId, status, createdAt)`
  - `SaleItem(batchId)`

## Stack & tools used in this phase
No new dependencies.

## Key files / entry points
- `apps/web/src/lib/offlineSalesQueue.ts`
- `apps/web/src/app/pos/page.tsx`
- `apps/web/src/components/Receipt.tsx`
- `docs/PRODUCTION_READINESS_CHECKLIST.md`
- `packages/db/prisma/schema.prisma`

## Decisions & trade-offs
- **The POS offline queue uses localStorage, not IndexedDB.** Pending sale payloads are small, and single-till offline volume is expected to be low. IndexedDB is the right upgrade if this becomes a high-volume or multi-device queue, but localStorage is simpler and appropriate for this first deployable version.
- **Only network/unavailable failures are queued.** Business-rule failures (insufficient stock, restricted medicine without a prescription, closed till, below-minimum pricing) are surfaced immediately. Retrying those silently later would create confusing or unsafe sales.
- **Receipt printing uses the browser print dialog.** No direct USB/serial printer or cash drawer integration was added because that depends on a specific hardware model and driver path.
- **Barcode scanner support is keyboard-wedge style only.** This matches the common low-cost scanner setup: the scanner types a barcode and sends Enter.
- **The checklist is treated as a build artifact, not a note.** It captures everything still blocking real usage, including Firebase/Supabase setup, payment gateway, notification delivery, legal/regulatory sign-off, monitoring, and load testing.

## Known issues / follow-ups
- No live offline end-to-end test has been run against real Firebase/Supabase credentials.
- No direct cash drawer integration.
- No label printer integration.
- No App Check, application-level rate limiting, load testing, backup policy, or production monitoring configured yet.
- No payment gateway or notification provider yet; those remain launch blockers for online ordering and staff/customer communication.

## How to verify this phase
Once real Supabase/Firebase credentials exist:
1. Open a till, add a product, then simulate offline mode in the browser and complete a sale — confirm it is queued locally.
2. Restore network — confirm the queue drains and the sale appears in Postgres with correct FEFO stock movements.
3. Trigger a business-rule failure while online (e.g. insufficient stock) — confirm it is **not** queued.
4. Scan or type a known barcode followed by Enter — confirm the item is added directly to the cart.
5. Complete a sale and print the receipt — confirm printed layout is usable.
6. Work through `docs/PRODUCTION_READINESS_CHECKLIST.md` before exposing the system to real users.
