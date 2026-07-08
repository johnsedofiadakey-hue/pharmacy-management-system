# Phase 1 — Identity, Roles & Branch Scaffolding

**Status:** Scaffolded — branch CRUD, staff invitation, and login are all built; still pending live Supabase/Firebase verification and automated permission tests
**Date:** 2026-07-07
**Corresponds to:** BLUEPRINT.md § Phase 1

## Goal recap
Let a Super Admin create/edit/deactivate branches, invite staff, and assign branch-scoped
roles, with every action enforced server-side by the permission matrix from Phase 0.

## What was built so far
- `requirePermission({ userId, branchId, resource, action })` — the single enforcement point
  for the resource x action permission matrix; every business-logic Cloud Function calls this
  before touching data
- `getCallerUser(request)` — resolves a Firebase Auth caller to their Postgres `users` row
- `listBranches` — Cloud Function, returns the caller's org's branches (requires `BRANCHES:VIEW`)
- `createBranch` — Cloud Function, validates input with zod, enforces `BRANCHES:CREATE`,
  rejects duplicate branch codes within an org
- `updateBranch` — edits branch fields, enforces `BRANCHES:EDIT` scoped to that branch
- `setBranchActive` — soft deactivate/reactivate toggle, enforces `BRANCHES:DELETE` (org-wide
  only — matches the seed data where only `super_admin` holds that grant, consistent with
  BLUEPRINT.md §3's "Super Admin is the only default role able to... deactivate branches")
- `assignUserRole` — Cloud Function, grants a role to a user scoped to a branch (or org-wide
  if `branchId` is null), enforces `EMPLOYEES:EDIT`, then calls `computeAndSyncClaims`
- `listRoles` — returns system default roles + this org's custom roles, enforces `EMPLOYEES:VIEW`
- `inviteStaffMember` — creates a Firebase Auth user + Postgres `users` row + initial
  `UserRole` in one flow, enforces `EMPLOYEES:CREATE`, rolls back the Firebase Auth user if the
  Postgres transaction fails, and returns a Firebase password-set link
- `apps/web` — Next.js (App Router, TypeScript, Tailwind) scaffolded, pnpm-workspace member
- `apps/web/src/lib/firebase/client.ts` — lazy, browser-only Firebase client init, plus
  `isFirebaseConfigured()` to detect when no real project is wired up yet
- `apps/web/src/lib/firebase/authContext.tsx` — `AuthProvider`/`useAuth()`, wraps the whole
  app at the root layout, exposes `{ user, claims, loading }`
- `apps/web/src/app/login/page.tsx` — email/password sign-in
- `apps/web/src/app/admin/layout.tsx` — client-side guard redirecting unauthenticated users to
  `/login`
- `apps/web/src/app/admin/branches/page.tsx` — Super Admin branches list/create/deactivate +
  staff invite form (shows the generated invite link directly, since no email/SMS provider is
  wired up yet)

## Stack & tools used in this phase
- Next.js 16.2.10 (App Router, Turbopack), Tailwind CSS v4, React 19
- `firebase` (client SDK) added to `apps/web`
- `zod` added to `functions` for callable-function input validation
- `.claude/launch.json` + `apps/web/dev.sh` wrapper script (needed because this machine's
  Node/pnpm live under nvm, not on the default PATH the preview tool spawns with)

## Key files / entry points
- `functions/src/lib/permissions.ts` — `requirePermission`
- `functions/src/lib/authContext.ts` — `getCallerUser`
- `functions/src/branches/listBranches.ts`, `createBranch.ts`, `updateBranch.ts`, `setBranchActive.ts`
- `functions/src/roles/assignUserRole.ts`, `listRoles.ts`
- `functions/src/staff/inviteStaffMember.ts`
- `apps/web/src/lib/firebase/client.ts`, `authContext.tsx`, `callables.ts`
- `apps/web/src/app/login/page.tsx`, `apps/web/src/app/admin/layout.tsx`
- `apps/web/src/app/admin/branches/page.tsx`

## Data model changes
None — uses the Phase 0 schema as-is.

## Decisions & trade-offs
- **Firebase client SDK must initialize lazily, browser-only.** Discovered via a real build
  failure: Next.js prerenders client-component routes at build time too, which executes
  module-level code server-side. Eagerly calling `initializeApp()`/`getAuth()` at module scope
  crashed the build with `auth/invalid-api-key` even before any real credentials existed —
  and would still be architecturally wrong once they do, since the Firebase JS SDK isn't meant
  to run in a server/Node context. Fixed by making `client.ts` export lazy getters guarded by
  `typeof window !== "undefined"`, and making `callables.ts` resolve the Functions instance
  inside each call rather than at import time.
- **Prisma's compound-unique `where` shorthand doesn't type-accept `null`** for a nullable key
  field (`user_roles`'s `branchId`), even though the query engine handles `IS NULL` correctly
  at runtime. Worked around with a cast (`branchId as unknown as string`), same pattern as
  `prisma/seed.ts`'s `Role` upsert on nullable `organisationId`. Documented here so it doesn't
  look like a mistake if seen again.
- **Prisma JSON fields need an explicit `Prisma.InputJsonValue` cast** — a plain
  `Record<string, unknown>` from zod validation doesn't structurally satisfy Prisma's JSON
  input type even though it's compatible at runtime.
- **`AuthProvider` wraps the entire app at the root layout, so an uncaught error inside it
  takes down every page, not just authenticated ones.** Found via a real crash: Firebase
  Auth's `onIdTokenChanged` throws asynchronously (outside any try/catch we control) when the
  API key is invalid — which is exactly the current state, since no real Firebase project
  exists yet. Fixed by adding `isFirebaseConfigured()` and skipping the Firebase subscription
  entirely when it returns false, rather than trying to catch an error that isn't thrown from
  code we call directly. This isn't just a workaround for the missing-credentials state — it's
  the correct general shape (don't let a root-level provider's background listener be able to
  take down the whole tree).
- **`inviteStaffMember` creates a Firebase Auth user before the Postgres transaction**, since
  the Postgres `users` row needs a `firebaseUid` to link to. If the transaction (user + role
  creation) fails after that, the function best-effort deletes the orphaned Firebase user in a
  catch block, so a partial failure doesn't leave a Firebase account with no matching Postgres
  record.
- **No real email/SMS/WhatsApp provider wired up for invitations.** `inviteStaffMember`
  generates a real Firebase password-set link but returns it directly to the caller (shown in
  the admin UI) instead of sending it. This is a deliberate placeholder, not an oversight — the
  account creation + role assignment + link generation are all real and won't need to change
  when a provider (SendGrid/Mailgun/Twilio/WhatsApp Business API) is chosen; only the "send it"
  step gets added.
- Deactivating a branch is gated on `BRANCHES:DELETE` rather than a dedicated action, since the
  permission action enum (VIEW/CREATE/EDIT/APPROVE/CANCEL/DELETE/EXPORT) has no "deactivate" —
  DELETE was the closest semantic fit for a soft-delete-style toggle, and matches which roles
  should be allowed to do it (only `super_admin` in the seed data).
- Kept the branches page deliberately minimal (no branch-edit UI, no per-role permission
  editor) — enough to prove the Cloud Function wiring end-to-end once real credentials exist.

## Known issues / follow-ups
- **Nothing in this phase has been exercised against a real Supabase/Firebase project.**
  Verified so far: `functions` builds clean and all 8 Cloud Functions load in the Functions
  emulator; the `web` app builds, and in the browser the `/admin` route guard correctly
  redirects an unauthenticated visitor to `/login` with no console errors and no crash. Once
  real credentials exist, this needs an actual end-to-end run: create an org/super_admin user
  via Prisma Studio or a seed, sign in, and confirm `listBranches`/`createBranch`/
  `setBranchActive`/`inviteStaffMember`/`assignUserRole` all work, and that `requirePermission`
  actually rejects a user lacking the grant (e.g. a `cashier` calling `createBranch`).
- No branch-edit UI in the browser yet (the `updateBranch` function exists and is wired into
  `callables.ts`, just not surfaced in the page).
- No automated tests yet for `requirePermission` — worth unit testing once a test DB exists.
- No real notification delivery for staff invites (see decision above).

## How to verify this phase
1. Fill in real Supabase/Firebase credentials (see Phase 0 build log)
2. `pnpm db:migrate && pnpm db:seed`
3. Create a test organisation + a user with the `super_admin` role via Prisma Studio, and
   sign that user in via Firebase Auth (matching `firebaseUid`)
4. Fill in `apps/web/.env.local` from `apps/web/.env.example`
5. `pnpm dev:web`, sign in at `/login`, confirm redirect to `/admin/branches` works and the
   branches list loads
6. Create a branch, deactivate/reactivate it, and invite a staff member — confirm the invite
   link works and the new user shows up with the right role in Postgres
7. Manually test `requirePermission` rejection: assign a low-privilege role (e.g. `cashier`)
   to a second test user and confirm calling `createBranch` as that user returns
   `permission-denied`
