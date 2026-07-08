# Phase 8 — Patient Care Module

**Status:** Scaffolded — vitals/consultations/care plans/follow-ups, org-wide clinical access, and pharmacist-facing UI all built; customer-facing patient portal deferred to Phase 9; pending live Supabase/Firebase verification
**Date:** 2026-07-08
**Corresponds to:** BLUEPRINT.md § Phase 8

## Goal recap
Let a pharmacist log a consultation/vitals and create a care plan with a follow-up, with
clinical continuity across branches — the differentiator identified early in this project's
planning (operational intelligence + clinical care, not just another POS).

## What was built
- Schema: `PatientProfile` (1:1 with `Customer`), `PatientVital`, `Consultation`, `CarePlan`,
  `CarePlanFollowup`, plus `CarePlanStatus`/`FollowupStatus` enums
- **`requirePermissionAnyBranch`** — a new permission-check variant (alongside the existing
  branch-scoped `requirePermission`) needed specifically because a pharmacist's
  `PATIENTS`/`CARE_PLANS` grant lives on a branch-scoped `UserRole` row, but clinical data
  access must be org-wide per the continuity-of-care decision made earlier in this project.
  Plain `requirePermission({branchId: null})` only matches a *truly* org-wide grant (like
  Super Admin's), which would incorrectly lock every branch-scoped pharmacist out of patient
  records entirely
- `ensurePatientProfile` — auto-creates a `PatientProfile` (and flips `Customer.isPatient`) the
  first time any clinical data is recorded for a customer
- `recordVitals` / `createConsultation` — branch-gated (`branch.clinicalCareEnabled` must be
  true), since these happen at a specific branch
- `createCarePlan` / `addCarePlanFollowup` / `completeCarePlanFollowup` — **not**
  branch-gated (see Decisions)
- `updatePatientProfile` — allergies/chronic conditions/consent
- `getPatientRecord` — the org-wide clinical view: vitals, consultations, and care plans
  queried by `customerId` alone, no branch filter
- `listUpcomingFollowups` — org-wide "what's due" list (the pharmacist caseload view — see
  Decisions for why it's framed this way)
- `findCustomerByPhone` — lookup helper the UI needed; customers aren't branch-owned either,
  same `requirePermissionAnyBranch` reasoning
- `/branch/patients` — pharmacist-facing UI: phone search, record vitals, log consultation,
  create care plan, view full clinical history, complete due follow-ups

## Stack & tools used in this phase
No new dependencies.

## Key files / entry points
- `packages/db/prisma/schema.prisma` — `PatientProfile`, `PatientVital`, `Consultation`,
  `CarePlan`, `CarePlanFollowup`, `CarePlanStatus`, `FollowupStatus`
- `functions/src/lib/permissions.ts` — `requirePermissionAnyBranch` (new export alongside
  `requirePermission`)
- `functions/src/patientCare/` — `ensurePatientProfile.ts`, `recordVitals.ts`,
  `createConsultation.ts`, `createCarePlan.ts`, `addCarePlanFollowup.ts`,
  `completeCarePlanFollowup.ts`, `updatePatientProfile.ts`, `getPatientRecord.ts`,
  `listUpcomingFollowups.ts`, `findCustomerByPhone.ts`
- `apps/web/src/app/branch/patients/page.tsx`

## Data model changes
Added `PatientProfile`, `PatientVital`, `Consultation`, `CarePlan`, `CarePlanFollowup` and
their enums, all hanging off `Customer` (1:1 via `PatientProfile.customerId`).

## Decisions & trade-offs
- **`requirePermissionAnyBranch` exists because the org-wide-clinical-record decision has a
  real permission-model consequence** that wasn't obvious until implementing it: "any
  pharmacist can see any patient" doesn't mean "check for an org-wide role" — a
  `superintendent_pharmacist` role is *itself* branch-scoped in `user_roles` (that's how the
  branch's Superintendent Pharmacist concept works). The right check is "does this user hold
  the permission at *any* of their branches," not "do they hold an org-wide grant." Getting
  this distinction right is the whole point of this phase's permission work.
- **`createCarePlan`/`addCarePlanFollowup`/`completeCarePlanFollowup` skip the
  `clinicalCareEnabled` branch gate** that `recordVitals`/`createConsultation` enforce — a care
  plan isn't tied to any single branch in the schema (no `branchId` field on `CarePlan`), so
  there's no one branch to check the flag against. The gate makes sense for actions that
  happen at a specific branch; it doesn't have a natural home on an inherently cross-branch
  entity.
- **`listUpcomingFollowups` is honestly not a "caseload"** in the sense of "patients assigned
  to me" — there's no patient-to-pharmacist assignment concept in this schema, and inventing
  one would be a fictional feature with no real data behind it. It's org-wide "what's due,"
  which is the accurate and useful thing to build given what actually exists, and it satisfies
  the same practical need (a pharmacist opening their day sees what needs attention).
- **The customer-facing "patient sees it in their portal" half of this phase's exit criteria is
  deferred to Phase 9**, same reasoning as Phase 7's prescription upload: there's no customer
  authentication system in this app at all (customers are identified by phone, not Firebase
  Auth accounts). Building a fake "patient portal" without real customer auth would be
  security-theater, not a feature. This phase builds the complete pharmacist-side data model
  and workflow so Phase 9 only needs to add a read view once customer auth exists — nothing
  here needs to change for that.

## Known issues / follow-ups
- **Nothing in this phase has been run against a real database.** Verified so far: schema
  generates, all packages build clean, all 46 Cloud Functions (Phases 0-8 combined) load in
  the emulator, and `/branch/patients` correctly redirects an unauthenticated visitor with zero
  console errors in an actual browser. This is now the seventh consecutive phase stacked on
  the same unverified foundation.
- No customer-facing patient portal (Phase 9, see Decisions).
- No UI to toggle `branches.clinicalCareEnabled` — the flag exists on the schema since Phase 0
  but there's no admin control surface for it yet; a Super Admin would need to set it directly
  in the database for now.
- `updatePatientProfile`'s allergies/chronicConditions aren't surfaced in the `/branch/patients`
  UI yet — the function exists and works, just not wired into this page's form.

## How to verify this phase
Once real Supabase/Firebase credentials exist:
1. Set a branch's `clinicalCareEnabled` to `true` (via Prisma Studio, since there's no UI yet)
2. As a pharmacist, search a customer by phone, record vitals and log a consultation at that
   branch — confirm a `PatientProfile` is auto-created and `Customer.isPatient` flips to true
3. Create a care plan with a first follow-up date — confirm it appears in
   `listUpcomingFollowups`
4. As a *different* pharmacist assigned to a *different* branch, call `getPatientRecord` for
   the same customer — confirm they see the full history (proving the org-wide access design
   actually works, not just branch-local data)
5. Complete the follow-up — confirm its status becomes `COMPLETED` and it drops out of
   `listUpcomingFollowups`
6. Try `recordVitals` at a branch with `clinicalCareEnabled: false` — confirm it's rejected
