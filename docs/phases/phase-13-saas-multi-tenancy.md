# Phase 13 — SaaS Multi-Tenancy

**Status:** Scaffolded — tenant status/plan fields, domain-to-organisation mapping, and public tenant resolver built; billing/self-service organisation signup deferred; pending live Supabase/Firebase verification
**Date:** 2026-07-08
**Corresponds to:** BLUEPRINT.md § Phase 13

## Goal recap
Prepare the single-organisation multi-branch product so it can later become a SaaS product serving many pharmacy organisations without rewriting the core data model.

## What was built
- `Organisation.status` — `ACTIVE`, `SUSPENDED`, `CANCELLED`
- `Organisation.plan` — `STARTER`, `GROWTH`, `ENTERPRISE`
- `OrganisationDomain` — maps storefront/admin hostnames to an organisation
- `resolveTenantByHost` Cloud Function — public read-only callable that resolves an active hostname to public organisation metadata
- Web callable wrapper for `resolveTenantByHost`

## Stack & tools used in this phase
No new dependencies.

## Key files / entry points
- `packages/db/prisma/schema.prisma` — `OrganisationStatus`, `OrganisationPlan`, `OrganisationDomain`
- `functions/src/storefront/resolveTenantByHost.ts`
- `functions/src/index.ts`
- `apps/web/src/lib/firebase/callables.ts`

## Data model changes
This phase deliberately keeps the original tenancy strategy: almost every business table already carries `organisationId`, and user roles are scoped through organisation/branch. The new `OrganisationDomain` table only adds the missing public-traffic entry point: "which organisation should this hostname resolve to?"

## Decisions & trade-offs
- **No self-service SaaS signup was built.** The product is still a single-organisation deployment that can now be routed by domain later. Creating organisations, billing subscriptions, subscription limits, trial states, invoices, and automated provisioning are real product surfaces, not a schema-only change.
- **Domain resolution is public and intentionally narrow.** It returns `organisation.id`, `organisation.name`, `plan`, `hostname`, and `isPrimary`; it does not expose settings, users, roles, branch internals, or billing data.
- **Suspended/cancelled organisations are blocked at resolver level.** That lets a SaaS shell stop public storefront access without deleting data.
- **Phase 9's `NEXT_PUBLIC_ORGANISATION_ID` remains a valid single-org deployment fallback.** A future deploy can call `resolveTenantByHost(window.location.hostname)` first, then fall back to the environment variable while migrating.

## Known issues / follow-ups
- No billing/subscription provider integration.
- No self-service organisation signup.
- No tenant-admin onboarding wizard.
- No per-plan feature gating yet, despite `Organisation.plan` existing.
- No custom-domain verification flow.
- No automated organisation provisioning or seed-role cloning per new tenant.

## How to verify this phase
Once real Supabase/Firebase credentials exist:
1. Create an `Organisation` and an active `OrganisationDomain` row pointing to a test hostname.
2. Call `resolveTenantByHost` with that hostname — confirm it returns only public tenant metadata.
3. Mark the domain inactive — confirm the resolver returns `not-found`.
4. Mark the organisation `SUSPENDED` — confirm the resolver returns `not-found`.
5. Use the resolved `organisation.id` with Phase 9's public storefront functions and confirm catalogue/branch queries are scoped to that tenant.
