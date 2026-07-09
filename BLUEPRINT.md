# Pharmacy Management System — Ghana
## Master Project Blueprint

> Source brainstorm: `pharmacy_management_system_ghana_blueprint.md` (original vision doc).
> This file is the **living execution blueprint** — goals, stack, architecture, and phased plan.
> Update the Progress Tracker and link a build log every time a phase completes. Never let this file go stale.

---

## 1. Project Goal

Build a **Multi-Branch Pharmacy Operating System for Ghana** — starting as a single organisation running multiple branches, architected so it can later grow into a multi-tenant SaaS product without a rewrite.

The system should always know: who the user is, which organisation/branch they belong to, what they can view vs. create vs. approve, and log everything sensitive permanently.

## 2. Objectives

1. Give every role (Super Admin, Branch Manager, Pharmacist, Cashier, Inventory Officer, Procurement, Customer, Patient) a **dedicated workspace** — not one dashboard with hidden tabs.
2. Make **batch/expiry-aware inventory (FEFO)** and the **stock movement ledger** the reliable core of the system — no silent stock edits, ever.
3. Give management **real-time, cross-branch intelligence**: expiry risk, transfer suggestions, fraud flags, branch benchmarking — not just static reports.
4. Support **clinical/patient care services** (vitals, consultations, care plans) as a first-class, opt-in module — differentiating this from a generic POS.
5. Keep the **POS usable offline** during poor connectivity, syncing automatically when back online.
6. Architect from day one so the same core can later serve **multiple pharmacy organisations as SaaS**, without redesigning the data model.

## 3. Core Differentiator

> Not just a system that tracks what a pharmacy sells — a system that tracks the health outcomes of the people it serves, across every branch, in real time.

Operational intelligence (stock, expiry, fraud, transfers) **+** clinical continuity (patient care plans, follow-ups, screening trends) is the combination that makes this exceptional, not just another POS with inventory.

---

## 4. Technology Stack

| Layer | Choice | Role |
|---|---|---|
| Auth | **Firebase Auth** | User identity, custom claims (`orgId`, `branchIds[]`, coarse `roles[]`) for fast client-side gating |
| Real-time / offline | **Firestore** | Live dashboards, offline POS cache + sales queue, notifications |
| File storage | **Firebase Storage** | Prescription uploads, receipts, product images |
| Push notifications | **Firebase Cloud Messaging** | In-app/mobile notifications |
| Backend API / business logic | **Firebase Cloud Functions (2nd gen)** | Verifies auth tokens, enforces fine-grained permissions, runs business logic (FEFO deduction, approvals, etc.), writes to Postgres, pushes projections to Firestore |
| System of record | **Supabase (Postgres)** | All financial/inventory/relational data — organisations, branches, roles, products, batches, ledger, sales, patients, prescriptions, procurement, audit log. Accessed via Supavisor pooler (transaction mode) |
| ORM | Prisma or Drizzle (decide at Phase 0 scaffolding) | Postgres schema/migrations from Cloud Functions |

### Architecture rule (do not violate)

**Postgres is the only source of truth for business data.** Firestore holds only caches, projections, and ephemeral real-time state. Clients never write directly to Postgres — every write goes through a Cloud Function that re-validates permissions server-side (client-side custom claims are for UX only, never trusted for authorization).

```
Client apps (POS / Admin / Storefront / Customer / Staff / Branch Manager / Pharmacist)
        │
        ├── Firebase Auth (custom claims: orgId, branchIds[], roles[])
        ├── Firestore (live dashboards, offline POS cache/queue, notifications)
        ├── Firebase Storage (prescriptions, receipts, images)
        │
        └── Cloud Functions (2nd gen) — API + business logic + permission checks
                └── Supabase Postgres (system of record) — via Supavisor pooler
```

---

## 5. Authority Model

Two independent axes — do not collapse them into one hierarchy:

- **Managerial authority**: Super Admin → Regional Manager → Branch Manager → Staff. Controls schedules, discounts, hiring, expenses.
- **Clinical authority**: Superintendent Pharmacist, scoped per branch via `user_roles`, independent of managerial hierarchy. A Branch Manager without pharmacist licensing cannot override a pharmacist's clinical decision. One person can hold both roles on one account (two rows in `user_roles`, same `user_id`/`branch_id`, different `role_id`).

Patient clinical records (vitals, consultations, care plans) are **org-wide visible to pharmacists**, not branch-scoped — continuity of care across branches matters more than branch data isolation for this data.

## 6. Account Directory (who sees what)

| Account | Scope | Sees |
|---|---|---|
| Super Admin | Whole org | Company-wide dashboard, all branches, approvals, procurement, org settings |
| Regional Manager | Assigned branches | Same as Super Admin, filtered to their region |
| Branch/Pharmacy Manager | One or more branches | Branch dashboard, staff/shifts, cash reconciliation, approvals up to their limit |
| Superintendent Pharmacist | Their branch(es), clinically; patients org-wide | Prescription queue, restricted-medicine approvals, patient caseload, care plans |
| Pharmacy Technician/Dispenser | Their branch | Dispensing queue |
| Cashier | Their branch/till | POS, own sales/shift performance |
| Inventory Officer | Branch or warehouse | Stock, batches, expiry, transfer requests |
| Procurement Officer | Branch or central | Purchase requests, RFQs, supplier comparison |
| Warehouse Manager | Central warehouse | Central stock, dispatch |
| Accountant/Auditor | Org-wide, read-mostly | Financial reports, reconciliation, audit trail |
| Delivery Rider | Assigned deliveries | Their delivery list/route |
| Customer | Own profile | Orders, prescriptions, loyalty, nearby branch stock |
| Patient (extends Customer) | Own care record | Care plan, screening history, follow-ups |

---

## 7. Data Model Summary

Full schema lives in the Phase 0/2 build logs once implemented. Domain groups:

1. **Identity & Access** — `organisations`, `branches`, `warehouses`, `users`, `roles`, `permissions`, `role_permissions`, `user_roles` (branch-scoped role assignments — the key table for the authority model)
2. **Product & Inventory** — `categories`, `products`, `batches`, `branch_stock` (cached current balance), `stock_movements` (append-only ledger, single source of truth — FEFO deducts from batches ordered by `expiry_date ASC`, in the same transaction as the balance update)
3. **Sales/POS** — `till_sessions`, `sales`, `sale_items` (batch-linked), `sale_payments`
4. **Customers & Patients** — `customers`, `patient_profiles`, `patient_vitals`, `consultations`, `care_plans`, `care_plan_followups`
5. **Prescriptions** — `prescriptions`, `prescription_items`
6. **Transfers & Procurement** — `stock_transfers`, `stock_transfer_items`, `suppliers`, `purchase_orders`, `purchase_order_items`
7. **Audit** — `audit_log` (nothing hard-deleted anywhere in the system; use status fields like `voided`/`cancelled`/`rejected`)

---

## 8. Execution Phases

Each phase must ship a working, testable slice before the next begins. When a phase completes, create `docs/phases/phase-N-<slug>.md` from `docs/phases/PHASE_LOG_TEMPLATE.md` and update the tracker below.

### Progress Tracker

| # | Phase | Status | Build Log |
|---|---|---|---|
| 0 | Foundation & Environment Setup | Scaffolded (pending live Supabase/Firebase project) | [phase-0-foundation.md](docs/phases/phase-0-foundation.md) |
| 1 | Identity, Roles & Branch Scaffolding | Scaffolded (branch CRUD, invites, login done; pending live Supabase/Firebase verification) | [phase-1-identity-roles-branch-scaffolding.md](docs/phases/phase-1-identity-roles-branch-scaffolding.md) |
| 2 | Product & Inventory Core (Batch/FEFO Ledger) | Scaffolded (schema, ledger engine, Cloud Functions done; pending live verification) | [phase-2-product-inventory-core.md](docs/phases/phase-2-product-inventory-core.md) |
| 3 | POS (Vertical Slice Sale Flow) | Scaffolded (sale/till flow + minimal UI done; void/refund/offline/receipts pending) | [phase-3-pos.md](docs/phases/phase-3-pos.md) |
| 4 | Branch Manager & Live Dashboards | Scaffolded (shifts, approvals, live dashboard + UI done; pending live verification) | [phase-4-branch-manager-dashboards.md](docs/phases/phase-4-branch-manager-dashboards.md) |
| 5 | Inter-Branch Transfers & Company Intelligence | Scaffolded (transfer workflow, company dashboard + UI done; pending live verification) | [phase-5-transfers-company-intelligence.md](docs/phases/phase-5-transfers-company-intelligence.md) |
| 6 | Procurement & Supplier Management | Scaffolded (supplier/PO workflow, discrepancy detection, UI done; pending live verification) | [phase-6-procurement-suppliers.md](docs/phases/phase-6-procurement-suppliers.md) |
| 7 | Prescriptions & Pharmacist Workspace | Scaffolded (intake, review, restricted-medicine gate + UI done; pending live verification) | [phase-7-prescriptions-pharmacist-workspace.md](docs/phases/phase-7-prescriptions-pharmacist-workspace.md) |
| 8 | Patient Care Module (Clinical Services) | Scaffolded (vitals/consultations/care plans, org-wide access, pharmacist UI done; patient portal deferred to Phase 9; pending live verification) | [phase-8-patient-care-module.md](docs/phases/phase-8-patient-care-module.md) |
| 9 | Storefront & Customer Portal | Scaffolded (customer auth, checkout, fulfilment, delivery + UI done; Paystack added in Phase 14; pending live Firebase verification) | [phase-9-storefront-customer-portal.md](docs/phases/phase-9-storefront-customer-portal.md) |
| 10 | Loyalty, Reporting & Forecasting | Scaffolded (loyalty tiers, full reporting suite, simplified forecasting + UI done; pending live verification) | [phase-10-loyalty-reporting-forecasting.md](docs/phases/phase-10-loyalty-reporting-forecasting.md) |
| 11 | Fraud Detection, Audit & Compliance | Scaffolded (alerts, recalls, adverse reactions, audit log, NHIS scaffold + UI done; pending live verification) | [phase-11-fraud-audit-compliance.md](docs/phases/phase-11-fraud-audit-compliance.md) |
| 12 | Hardening, Devices, Offline & Launch Prep | Scaffolded (offline POS queue, barcode UX, receipt print path, production checklist + hardening review done; pending live verification) | [phase-12-hardening-devices-offline-launch-prep.md](docs/phases/phase-12-hardening-devices-offline-launch-prep.md) |
| 13 | SaaS Multi-Tenancy (Future) | Scaffolded (organisation status/plan, domain mapping, tenant resolver done; billing/self-service signup deferred; pending live verification) | [phase-13-saas-multi-tenancy.md](docs/phases/phase-13-saas-multi-tenancy.md) |
| 14 | Paystack Payments & Live Readiness | Live (Cloud Functions, Firestore, Storage, Auth all deployed/enabled on `nexuspharmasystem`; first Super Admin created for Nexus Pharma and login verified live; pending only a Paystack test key, deliberately deferred to the account owner) | [phase-14-paystack-payments-live-readiness.md](docs/phases/phase-14-paystack-payments-live-readiness.md) |
| 15 | Audit Hardening & Public UI | Built (tenant checks, stock/idempotency/payment timing fixes, public marketing site, branch gateway, and clinical UI refresh done; pending live Paystack webhook/test) | [phase-15-audit-hardening-public-ui.md](docs/phases/phase-15-audit-hardening-public-ui.md) |
| 16 | Public Experience & Location-Aware Storefront | Built (richer public site, discreet admin access, branch coordinates, nearest-branch selection, product categories, and faster checkout UX done; live demo password update pending Console/service-account access) | [phase-16-public-experience-location-aware-storefront.md](docs/phases/phase-16-public-experience-location-aware-storefront.md) |

### Phase Details

**Phase 0 — Foundation & Environment Setup**
Firebase project (Auth/Firestore/Storage/Functions) + Supabase project (Postgres + Supavisor). Repo scaffolding, ORM choice, first migration: `organisations`, `branches`, `warehouses`, `users`, `roles`, `permissions`, `role_permissions`, `user_roles`. Custom-claims-sync Cloud Function.
*Exit criteria:* create an org, a branch, a user, assign a role, and see correct claims on that user's ID token.

**Phase 1 — Identity, Roles & Branch Scaffolding**
Super Admin portal: create/edit/deactivate branches, invite staff, assign branch-scoped roles. Invitation flow (email/SMS/WhatsApp). Permission-check middleware in Cloud Functions.
*Exit criteria:* Super Admin sets up an org with 2+ branches and staff with correctly scoped roles; permission checks covered by tests.

**Phase 2 — Product & Inventory Core**
Product catalogue CRUD, batch tracking, `branch_stock`, `stock_movements` ledger, FEFO deduction service.
*Exit criteria:* create a product, receive stock into a batch, deduct via FEFO, ledger + balance update atomically and correctly.

**Phase 3 — POS**
Product search/cart/checkout, split payments, till open/close, offline cache + sync queue, receipt generation.
*Exit criteria:* cashier completes a sale end-to-end (online and simulated offline), correct batch deducted, receipt + ledger + audit entries created.

**Phase 4 — Branch Manager & Live Dashboards**
Branch dashboard (sales, cash, stock, staff, approvals), shift management, cash reconciliation, adjustment/discount approval workflow, Firestore live-projection sync from Cloud Functions.
*Exit criteria:* dashboard reflects real Postgres state in near real time; adjustment approval workflow enforced.

**Phase 5 — Inter-Branch Transfers & Company Intelligence**
Transfer request/approve/dispatch/receive workflow, Super Admin company-wide dashboard, branch benchmarking, expiry-risk transfer suggestions.
*Exit criteria:* a transfer between two branches moves stock/batches correctly; Super Admin sees aggregated cross-branch data.

**Phase 6 — Procurement & Suppliers**
Supplier profiles, purchase requests, POs, goods receiving with discrepancy detection, automatic purchase suggestions.
*Exit criteria:* full procure-to-stock cycle works; discrepancies flagged for resolution.

**Phase 7 — Prescriptions & Pharmacist Workspace**
Prescription upload/review workflow, restricted-medicine workflow, substitution workflow with pharmacist sign-off.
*Exit criteria:* customer uploads a prescription, pharmacist reviews/approves, linked to a completed POS sale.

**Phase 8 — Patient Care Module**
Patient profile extension, vitals, consultations, care plans + follow-ups, pharmacist caseload view, Patient Management Portal. Opt-in per branch (`branches.clinical_care_enabled`).
*Exit criteria:* pharmacist logs a consultation/vitals, creates a care plan with a follow-up; patient sees it in their portal.

**Phase 9 — Storefront & Customer Portal**
Public storefront (browse, branch availability, prescription upload, ordering), customer portal (history, loyalty, tracking), checkout with MoMo/card, order fulfilment workflow, delivery management.
*Exit criteria:* customer places an online order, branch fulfils it, pickup/delivery tracked to completion.

**Phase 10 — Loyalty, Reporting & Forecasting**
Loyalty tiers/points, full reporting suite (sales, profitability, inventory, procurement, operations), demand forecasting, refined branch benchmarking.

**Phase 11 — Fraud Detection, Audit & Compliance**
Suspicious-activity alerts, drug recall system, adverse reaction reporting, full audit-trail UI for auditors, NHIS module scaffolding.

**Phase 12 — Hardening, Devices, Offline & Launch Prep**
Full offline robustness review, device support (barcode scanner, receipt/label printer, cash drawer), security review, performance tuning, production-readiness checklist.

**Phase 13 — SaaS Multi-Tenancy (Future)**
Tenant isolation layer, subscription plans, System Owner portal. Only after single-org multi-branch is proven solid in production.

**Phase 14 — Paystack Payments & Live Readiness**
Paystack payment initialization/verification, customer checkout redirect, payment metadata, and deployment checklist updates.

**Phase 15 — Audit Hardening & Public UI**
Audit-driven backend hardening for tenant isolation, stock safety, POS idempotency, transfer bounds, and payment timing. Public Nexus Pharma marketing homepage with product/delivery messaging, universal branch/login gateway, and clinical trust-focused UI refresh across public, storefront, login, branch, admin, and POS surfaces.

**Phase 16 — Public Experience & Location-Aware Storefront**
Richer public marketing experience, discreet admin access, branch-coordinate capture, customer geolocation-based nearest-branch selection with manual fallback, professional product categories, and fewer-click checkout flow.

---

## 9. Documentation Process (mandatory, per phase)

When a phase is completed:

1. Copy `docs/phases/PHASE_LOG_TEMPLATE.md` to `docs/phases/phase-N-<slug>.md`.
2. Fill it in — what was built, exact stack pieces/libraries used, key files/entry points, decisions and trade-offs made, known issues/follow-ups, how to verify it.
3. Update the Progress Tracker row in this file: status → `Complete`, link the build log.
4. If a phase changes an earlier architectural decision, update the relevant section of this file directly — this file must always reflect current reality, not just history.

This keeps the project traceable: any future bug can be tracked back to the phase log that explains what was built and why.
