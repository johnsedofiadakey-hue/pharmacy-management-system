# Phase 16 — Public Experience & Location-Aware Storefront

**Status:** Built and locally verified — richer public site, discreet admin access, demo-login prefill, branch coordinates in admin, nearest-branch customer selection, category-led storefront, and faster checkout UX are complete; live Firebase Auth password update needs Console/service-account access.
**Date:** 2026-07-09
**Corresponds to:** Public website and customer experience upgrade after Phase 15

## Goal recap
Make the public website feel like a polished pharmacy brand, not just an internal system front door. Customers should see relevant services, product categories, delivery value, and nearest-branch guidance. Super Admin should still manage multiple branches and staff, with branch coordinates powering customer location matching.

## What was built
- Rebuilt the public homepage with richer marketing sections, service cards, product-category motion, campaign/advertisement cards, and a more colorful visual system.
- Made admin/staff access more discreet on the public site.
- Added branch coordinate fields to the Super Admin branch creation UI.
- Exposed `gpsLat` and `gpsLng` in the public branch callable.
- Added browser-location nearest-branch selection to the public branch gateway.
- Added nearest-branch selection to the storefront checkout, with manual branch selector retained as fallback.
- Reworked storefront product arrangement into practical categories: pain/fever, cold/flu, vitamins, baby care, personal care, and prescription review.
- Reduced checkout friction by keeping branch, fulfilment, payment, and cart in a sticky checkout panel.
- Prefilled the staff login form with demo credentials: `admin@pharmacy.com` / `admin123`.
- Preserved the deployed Functions `setGlobalOptions({ invoker: "public" })` source fix so repository source matches live callable behavior.

## Stack & tools used in this phase
- Next.js App Router.
- Tailwind CSS v4 and custom CSS animation.
- Firebase callable Functions.
- Browser Geolocation API.
- Firebase Auth login form.

## Key files / entry points
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/store/page.tsx`
- `apps/web/src/components/PublicBranchEntry.tsx`
- `apps/web/src/app/admin/branches/page.tsx`
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/lib/firebase/callables.ts`
- `functions/src/storefront/publicListBranches.ts`
- `functions/src/index.ts`

## Data model changes
No schema migration was needed. `Branch.gpsLat`, `Branch.gpsLng`, and `Branch.physicalAddress` already existed; this phase exposed and consumed those fields in the UI.

## Decisions & trade-offs
- **Location is opt-in.** The browser asks permission only when the customer clicks the nearest-branch action.
- **Manual branch selection remains visible.** If geolocation fails, is denied, or branches have no coordinates, customers can still pick a branch.
- **Product categorization is inferred for now.** The storefront uses product names/classification to group products. A future product taxonomy table would be more precise for production merchandising.
- **Animations are restrained and respect reduced-motion settings.** The site is more lively, but healthcare trust still matters.
- **Demo credentials are prefilled but not hardcoded as an auth bypass.** Firebase Auth still controls real access.

## Known issues / follow-ups
- Update the live Firebase Auth user password for `admin@pharmacy.com` to `admin123` from the Firebase Console or with a service account key. The local Admin SDK attempt failed because Application Default Credentials were unavailable.
- Add product images, proper product categories, brands, and promotional merchandising once real catalogue data exists.
- Add distance-aware product availability so nearest branch stock can be shown per product.
- Add a one-page "services" detail route for consultations, refills, delivery, and prescription review.
- Add a Paystack webhook and abandoned-order stock release job before real payment volume.

## Verification completed
- Ran `pnpm -r build` successfully.
- Started the Next.js app locally at `http://127.0.0.1:3000`.
- Browser-verified `/` desktop at 1280px.
- Browser-verified `/store` mobile at 390px after fixing the storefront column overflow.
- Confirmed `/store` document width matches viewport width on mobile.
- Confirmed `/login` builds with demo credentials prefilled.

## How to verify this phase live
1. Deploy Hosting and Functions.
2. In Firebase Console, set `admin@pharmacy.com` password to `admin123`.
3. Sign in at `/login` using the prefilled demo credentials.
4. Create a branch with physical address, latitude, and longitude.
5. Visit the public homepage and use "Find nearest branch"; allow location permission.
6. Confirm the nearest branch auto-selects when coordinates exist.
7. Visit `/store`, use location, add products, and confirm checkout uses the nearest or selected branch.
