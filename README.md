# Pharmacy Management System — Ghana

Multi-branch pharmacy operating system. See [`BLUEPRINT.md`](./BLUEPRINT.md) for the full
product vision, architecture, and phased execution plan, and [`docs/phases/`](./docs/phases)
for a build log of each completed phase.

## Stack

- **Firebase** — Auth, Firestore (real-time/offline cache), Storage, Cloud Functions (2nd gen)
- **Supabase (Postgres)** — system of record for all business data, via Prisma
- **pnpm workspaces** monorepo

## Repo layout

```
packages/db/       Prisma schema + generated client (shared by functions)
functions/          Firebase Cloud Functions (API + business logic layer)
apps/web/           Next.js app — role-based portals (Super Admin, Branch Manager, etc.)
docs/phases/        Per-phase build logs
BLUEPRINT.md         Master plan — goals, stack, phases, progress tracker
```

## Prerequisites

- Node.js 20+ (this repo was set up with Node 24 via nvm)
- pnpm (`npm install -g pnpm`)
- firebase-tools (`npm install -g firebase-tools`), then `firebase login`
- A Firebase project (console.firebase.google.com)
- A Supabase project (supabase.com) for Postgres

## First-time setup

1. `pnpm install`
2. Copy `packages/db/.env.example` → `packages/db/.env` and fill in your Supabase
   `DATABASE_URL` (pooled, port 6543) and `DIRECT_URL` (direct, port 5432).
3. `pnpm db:generate` — generates the Prisma client
4. `pnpm db:migrate` — runs the first migration against Supabase
5. Update `.firebaserc` with your real Firebase project ID
6. `pnpm functions:build` then `firebase emulators:start` to run locally
7. Copy `apps/web/.env.example` → `apps/web/.env.local` and fill in your Firebase web app
   config (Firebase Console → Project Settings → General → Your apps)

## Scripts

| Command | Does |
|---|---|
| `pnpm db:generate` | Regenerate Prisma client from schema |
| `pnpm db:migrate` | Create/apply a Postgres migration (dev) |
| `pnpm functions:build` | Compile Cloud Functions |
| `pnpm functions:serve` | Build + run Cloud Functions emulator |
| `pnpm dev:web` | Run the web app (once `apps/web` exists, from Phase 1) |
