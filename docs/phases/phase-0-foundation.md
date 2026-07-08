# Phase 0 — Foundation & Environment Setup

**Status:** Scaffolded — pending live Supabase/Firebase project for full verification
**Date:** 2026-07-07 (scaffold); to be updated once migration + claims sync are verified against real infra
**Corresponds to:** BLUEPRINT.md § Phase 0

## Goal recap
Stand up the monorepo, the Postgres schema for identity/access, the Firebase Cloud Functions
scaffold, and the custom-claims-sync mechanism — the foundation every later phase builds on.

## What was built
- pnpm workspace monorepo: `packages/db` (Prisma), `functions` (Firebase Cloud Functions)
- Prisma schema for Identity & Access: `organisations`, `branches`, `warehouses`, `users`,
  `roles`, `permissions`, `role_permissions`, `user_roles`
- `computeAndSyncClaims(userId)` — reads a user's roles from Postgres, sets minimal Firebase
  Auth custom claims (`orgId`, `roles[]`), and writes a richer mirror doc to
  `users/{firebaseUid}` in Firestore (full branch list + role-per-branch detail) for
  client-side real-time reads
- `syncUserClaims` — an `onCall` Cloud Function wrapper around the above, for manual/admin
  resync, gated by a placeholder self-or-super_admin check
- Firebase config: `firebase.json` (functions + firestore + storage + emulator ports),
  `firestore.rules` (deny-by-default, `users/{uid}` self-read only), `storage.rules`
  (deny-by-default), `.firebaserc` (placeholder project ID)
- Seed script (`packages/db/prisma/seed.ts`): seeds the full 16-resource x 7-action permission
  grid, and the system default roles from BLUEPRINT.md §5 with their permission grants
  (`super_admin`, `head_office_admin`, `regional_manager`, `branch_manager`,
  `superintendent_pharmacist`, `pharmacy_technician`, `cashier`, `inventory_officer`,
  `procurement_officer`, `warehouse_manager`, `accountant`, `auditor`, `delivery_rider`)

## Stack & tools used in this phase
- Node.js v24.18.0 (via nvm — machine had no Node/npm/Homebrew installed at all)
- pnpm 10.15.0, firebase-tools 15.22.4
- Prisma 6.19.3 (`@prisma/client`, `prisma` CLI), `tsx` for running the seed script
- `firebase-admin` / `firebase-functions` v2 (2nd gen)

## Key files / entry points
- `packages/db/prisma/schema.prisma` — Phase 0 data model
- `packages/db/src/index.ts` — Prisma client singleton export
- `packages/db/prisma/seed.ts` — default roles/permissions seed
- `functions/src/auth/claims.ts` — `computeAndSyncClaims`
- `functions/src/auth/syncUserClaims.ts` — callable wrapper
- `functions/src/admin.ts` — Firebase Admin SDK init
- `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`

## Data model changes
Initial schema — see file above. No migration has been run yet (no live Postgres connected).

## Decisions & trade-offs
- **`packages/db` needed a real `tsc` build**, not a `main` pointing straight at TS source —
  pointing `main`/`types` at `src/index.ts` caused Node's native TypeScript support (Node 24)
  to route the nested relative import into Prisma's generated client through ESM resolution,
  which doesn't handle directory imports the way CJS `require()` does
  (`ERR_UNSUPPORTED_DIR_IMPORT`). Fixed by compiling to `dist/` and pointing `main`/`types`
  there, like a normal package.
- **Custom claims stay minimal** (`orgId` + deduped role names only) — a Regional Manager
  could be scoped to dozens of branches, and Firebase ID tokens have a ~1000-byte claims
  limit. Full branch-by-branch role detail lives in the `users/{uid}` Firestore mirror doc
  instead, which the client reads via a listener, not the token.
- **Dropped the separate `user_branch_assignments` table** from the original design —
  `user_roles.branchId` alone already tells you which branches a user operates in; a second
  table would just be a redundant source of truth. Added `users.primaryBranchId` instead, for
  the "default branch to land on" UX need.
- **No local Postgres/Docker/Java available on this machine.** Rather than fight the
  environment to fabricate a substitute, verification was split: static/build-level
  correctness (Prisma schema generates, `tsc` builds clean, seed script typechecks, the
  `syncUserClaims` function loads in the Firebase Functions emulator) was verified now;
  live-runtime verification (actual migration, actual custom-claims/Firestore write) is
  deferred until the user creates the real Supabase and Firebase projects.
- `pnpm-workspace.yaml` needed an explicit `onlyBuiltDependencies` list (Prisma's postinstall
  scripts are blocked by pnpm 10 by default) — added `@prisma/client`, `@prisma/engines`,
  `prisma`, `protobufjs`.

## Known issues / follow-ups
- **Migration has not been run against a real database yet.** `DATABASE_URL`/`DIRECT_URL` in
  `packages/db/.env` are currently placeholder/dummy values (gitignored) that only satisfy
  Prisma's `generate` step, not an actual connection. Once the user creates the Supabase
  project: fill in real values, run `pnpm db:migrate`, then `pnpm db:seed`.
  (Tracked as task: "Get user to create real Firebase + Supabase projects".)
  Once run, this Phase 0 log should be updated to "Complete" with the migration name.
  Because Prisma's dummy `.env` never had a schema applied, the very first `migrate dev` run
  against the real database will generate the initial migration folder from scratch — expect
  that, it's not an error.
- **Claims sync has not been exercised end-to-end.** Verified only that the code loads inside
  the Cloud Functions emulator (`✔ functions[us-central1-syncUserClaims]: http function
  initialized`). Need a real Firebase project (or a local JVM for the Auth/Firestore
  emulators, not installed on this machine) to confirm `setCustomUserClaims` and the
  Firestore mirror write actually work.
- `.firebaserc` still has a placeholder project ID — must be replaced with the real project ID.
- No `apps/web` yet — starts in Phase 1.

## How to verify this phase
Once real Supabase/Firebase credentials exist:
1. `packages/db/.env` — fill in real `DATABASE_URL` / `DIRECT_URL`
2. `pnpm db:migrate` — should create and apply the first migration
3. `pnpm db:seed` — should print "Seeded 112 permissions" and one line per role
4. `.firebaserc` — replace the placeholder with the real Firebase project ID
5. Create a test org/branch/user/role assignment via `prisma studio` (`pnpm --filter @pharmacy-os/db studio`), call `computeAndSyncClaims` for that user, and confirm via the Firebase console that the user's custom claims and the `users/{uid}` Firestore doc are populated correctly
