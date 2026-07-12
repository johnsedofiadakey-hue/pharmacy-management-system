# Phase 17 — Repo Recovery, Critical UX Fixes & Visual Redesign

**Status:** Built — repo made buildable again, four UX-critical logic fixes shipped, new design system applied to public site, storefront, and POS; portal pages (admin/branch) still on the old markup pending their own pass
**Date:** 2026-07-10
**Corresponds to:** Design critique of 2026-07-10 (system redesign + logic improvement request)

## Goal recap
Full design critique surfaced: (1) the repo could not build from a fresh clone, (2) four
customer/cashier-facing logic gaps that lose carts and money records, (3) a visual identity
that read "artisan café" rather than "licensed clinical care."

## What was built

### Repo recovery (critical)
- **Root cause:** the root `.gitignore` had a blanket `lib/` rule (meant for the Cloud
  Functions build output) that silently excluded `apps/web/src/lib/` AND `functions/src/lib/`
  from every commit. A fresh clone was missing the entire Firebase client layer and the
  server-side auth/permission core. Fixed to `functions/lib/`.
- Reconstructed `apps/web/src/lib/`: `firebase/client.ts`, `firebase/authContext.tsx`,
  `firebase/callables.ts` (fully typed wrappers for every Cloud Function the UI uses),
  `firebase/useBranchLive.ts`, `offlineSalesQueue.ts` — rebuilt from page usage and each
  function's zod schema/return shape.
- Reconstructed `functions/src/lib/`: `authContext.ts` (getCallerUser), `permissions.ts`
  (requirePermission / requirePermissionAnyBranch), `customerAuthContext.ts`
  (getCallerCustomer), `auditLog.ts` (recordAuditLog), `loyalty.ts` (computeLoyaltyTier /
  awardLoyaltyPoints) — from the Phase 1/10 build-log contracts and all 100+ call sites.
- `apps/web/.env.example` added; `dev.sh` and `.claude/launch.json` de-hardcoded from the
  previous machine's paths.

### Critical UX-logic fixes
- **Editable, persistent carts** — `useStoredCart` hook (localStorage): per-line −/+/remove
  in both storefront and POS; refresh or navigation no longer wipes a cart.
- **Signup no longer eats the checkout** — unauthenticated checkout redirects to
  `/store/signup?next=/store`; signup/login honour `next` and the persisted cart is intact.
- **Till session rehydration** — new `getActiveTillSession` Cloud Function; POS restores an
  open till (and its branch) on mount instead of forgetting it on refresh.
- **No silently dropped offline sales** — queue entries rejected for business reasons move
  to a visible FAILED state with retry/discard actions in the POS ("Sales needing review"),
  instead of being deleted.
- POS gains single-tender payment method selection (cash / MoMo / card).
- App boots without Firebase env config (public pages render signed-out instead of crashing).

### Design system & reskins
- New tokens in `globals.css`: clinical deep-green primary (#0e7a5f / #0a5c48), calm off-white
  ground, amber reserved for warnings, red for danger; flat crisp surfaces; skeleton/alert
  primitives; `tabular-nums` on money.
- Fonts: Inter (UI) + self-hosted Satoshi 500/700 (display) via `next/font` — replaces
  Geist + Source Serif.
- UI kit: `apps/web/src/components/ui/index.tsx` — Button, Card, Input/Select/Textarea,
  FieldLabel, Badge, Stat, Alert, EmptyState, Skeleton.
- Public site: self-contained gradient hero (Unsplash hotlink removed), one clear primary CTA,
  decorative marquee/float animations removed, branch entry pulled up under the hero.
- Storefront: search-first sticky header, branch strip with geolocation, price-forward product
  cards, restricted items shown as non-purchasable with guidance, skeleton loading, empty
  states, structured checkout panel.
- POS: full-width split-pane till (products left, always-visible cart right), large touch
  targets, barcode-first search preserved, big total, offline/queued/failed status in the till bar.

## Key files / entry points
- `.gitignore`, `apps/web/.env.example`, `apps/web/dev.sh`, `.claude/launch.json`
- `apps/web/src/lib/**` (all reconstructed), `apps/web/src/lib/useStoredCart.ts`
- `functions/src/lib/**` (all reconstructed), `functions/src/pos/getActiveTillSession.ts`
- `apps/web/src/app/globals.css`, `apps/web/src/app/layout.tsx`, `apps/web/src/fonts/`
- `apps/web/src/components/ui/index.tsx`
- `apps/web/src/app/page.tsx`, `apps/web/src/app/store/page.tsx`, `apps/web/src/app/pos/page.tsx`
- `apps/web/src/app/store/signup/page.tsx`, `apps/web/src/app/store/login/page.tsx`

## Data model changes
None.

## Decisions & trade-offs
- Reconstructed lib code follows the documented contracts (phase logs) and observed call-site
  behaviour; loyalty points use 1 point per GHS 1 (floored) with the Phase 10 placeholder tier
  thresholds — the exact original formula was undocumented, so this is an explicit assumption.
- Fontshare ships Satoshi in 500/700 (no 600); CSS 600 resolves to the nearest weight.
- POS payment selection is single-tender; split tender remains a backend-only capability.
- Portal pages (admin/*, branch/*) inherit the new tokens automatically but keep their old
  markup; they also carry pre-existing `react-hooks/set-state-in-effect` lint errors.

## Known issues / follow-ups
- Reconstructed backend lib must be verified against the live `nexuspharmasystem` project
  (login, a permission-gated call, a POS sale, loyalty award) before any deploy.
- Portal pages reskin + their lint debt.
- Storefront catalogue still loads unpaginated; server-side search/pagination needed at scale.
- Product categories still keyword-derived on the client; expose `categoryId` through
  `publicListProducts` and drive from the Category table.
- Cashier branch auto-detection (claims/mirror doc) still pending — POS branch select remains
  manual until the till rehydration takes over.

## How to verify this phase
1. Fresh clone → `corepack pnpm install` → `pnpm --filter @pharmacy-os/db generate && build`
   → `node functions/scripts/vendor-db.js` → `pnpm install` → both `web` and `functions` build.
2. With env config: add items to the store cart, refresh (cart persists), hit checkout while
   signed out, complete signup, land back on `/store` with the cart intact.
3. Open a till, refresh the POS — the till and branch restore automatically.
4. Queue an offline sale, make it fail on sync (e.g. remove the stock) — it appears under
   "Sales needing review" with retry/discard, and is never silently deleted.
