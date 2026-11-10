# TrustPay System Architecture & Codebase Audit

**Date**: November 9, 2026  
**Status**: Comprehensive Baseline Audit (Phase 1)

---

## 1. Executive Summary & Inventory
This document serves as the single comprehensive audit of the TrustPay codebase covering backend API endpoints, database models, frontend routes, security invariants, and test coverage before executing the full autonomous rebuild.

---

## 2. API Endpoints Catalog

| Method | Endpoint | Router | Status | Purpose & Notes |
|---|---|---|---|---|
| `POST` | `/api/demo-login` | `auth.py` | Working | Issues signed HS256 JWT with `user_id` & `role`. Verified. |
| `GET` | `/api/jobs` | `jobs.py` | Working | Lists jobs. Strips private `max_budget` for non-owners. |
| `POST` | `/api/jobs` | `jobs.py` | Working | Creates job in `open` status. Stores private `max_budget`. |
| `GET` | `/api/jobs/{id}` | `jobs.py` | Working | Full job details with active contract and applications. |
| `POST` | `/api/jobs/{id}/applications` | `applications.py` | Working | Freelancer submits application with private `min_price`. |
| `GET` | `/api/jobs/{id}/applications` | `applications.py` | Working | Client views all candidates (strips `min_price`). |
| `GET` | `/api/applications/{id}` | `applications.py` | Working | Application detail thread with privacy role masking. |
| `POST` | `/api/applications/{id}/negotiate` | `applications.py` | Working | 3-6 round agent negotiation with reject-and-regenerate. |
| `POST` | `/api/applications/{id}/decide` | `applications.py` | Working | Human Accept, Reject, Counter (max 2). |
| `POST` | `/api/applications/{id}/claim-fund` | `applications.py` | Working | Atomic conditional `open -> funding` UPDATE + PayPal order. |
| `POST` | `/api/applications/{id}/confirm-fund`| `applications.py` | Working | Verifies PayPal authorization, sets `active_contract_id`. |
| `POST` | `/api/applications/{id}/cancel-fund` | `applications.py` | Working | Reverts `funding -> open` on abort/failure. |
| `POST` | `/api/jobs/{id}/milestones/{m_id}/submit` | `milestones.py` | Needs Update | Deliverable submission. Needs re-verifying on `active_contract_id`. |
| `POST` | `/api/jobs/{id}/milestones/{m_id}/dispute`| `disputes.py` | Needs Update | Dispute filing and agent arbitration. |
| `GET` | `/api/health` | `main.py` | Working | Reports live PayPal OAuth & Groq LLM connectivity status. |
| `GET` | `/api/stats` | `main.py` | Working | Returns database ledger metrics for dashboard. |
| `POST` | `/api/demo/seed` | `seed.py` | Needs Update | Seed demo scenarios. Needs idempotent reset and `is_demo=True`. |
| `POST` | `/api/demo/reset` | `seed.py` | Needs Update | Deletes demo data. Needs dedicated endpoint `/api/demo/reset`. |

---

## 3. Database Models & Schema Status

| Model | Table | State | Audit Notes |
|---|---|---|---|
| `Job` | `jobs` | Healthy | Has `client_id`, `max_budget` (private), `active_contract_id`, `status`. Needs strict state machine validation. |
| `Application` | `applications`| Healthy | Has `job_id`, `freelancer_id`, `min_price` (private), `status`, `counters_used`. |
| `Contract` | `contracts` | Healthy | Removed legacy unique `job_id` constraint. Linked to `Job` and `Application`. |
| `Milestone` | `milestones` | Healthy | Holds acceptance criteria, status (`pending`, `submitted`, `verified`, `paid`, `disputed`). |
| `AcceptanceCriterion` | `acceptance_criteria` | Healthy | Testable criteria with weights. |
| `DeliverableSubmission`| `deliverable_submissions` | Healthy | Versioned deliverable records. |
| `JudgeEvaluation` | `judge_evaluations` | Healthy | AI Judge score, verdict (`pass`, `partial`, `fail`), evidence. |
| `DisputeRecord` | `disputes` | Healthy | Dispute claims, reasons, and AI arbitrator rulings. |
| `AuditLog` | `audit_logs` | Healthy | Append-only event history with actor and payload details. |

---

## 4. Frontend Route Architecture & Issues

| Route | View | Current State | Issues to Address in Phase 3 |
|---|---|---|---|
| `/` | Landing / Role Selection | Redesigned (White) | Has Framer Motion 10s story loop. Top nav needs responsive nowrap fix at $\ge 1024$px. |
| `/client` | Client Dashboard | Working | Stats must strictly equal ledger rows from shared stats service. Clean empty state. |
| `/client/jobs/new` | Post Job Wizard | Working | 3-step wizard with private-budget badge and optional public estimate. |
| `/client/jobs/[id]` | Job & Applications Detail | Working | Needs unified stepper: `Posted > Applied > Negotiating > Review Contract > Funded > Work in Progress > Paid`. |
| `/client/jobs/[id]/fund` | Fund Escrow | Working | Real PayPal popup authorization. |
| `/client/payments` | Payments Ledger | Working | PayPal IDs formatted in monospace with copy buttons. |
| `/client/disputes` | Disputes Room | Working | Displays claims, reasons, and arbitration ruling. |
| `/freelancer` | Freelancer Dashboard | Working | "Next Action" list must be deduplicated and linked to exact applications. |
| `/freelancer/opportunities` | Job Opportunities | Working | Displays only open jobs with public estimate or "Negotiable". "Apply & Negotiate" modal. |
| `/freelancer/work` | My Work | Working | Displays ONLY the logged-in freelancer's applications and contracts. |
| `/freelancer/work/[id]` | Workspace & Deliverables | Working | Drag-and-drop file dropzone, live test execution, Judge verdict breakdown. |
| `/freelancer/earnings` | Earnings Ledger | Working | Totals must strictly match sum of captured PayPal milestones. |
| `/demo` | Demo Hub | Working | Standalone tools for Seed, Reset, and persona switching. |

---

## 5. Identified Bugs & Inconsistencies for Elimination

1. **Dev DB Contamination**:
   - `trustpay.db` currently contains 114 jobs, with leftover test rows (`"Test Job Fast"`, `"Atomic Race Job"`).
   - *Fix*: Provide `/api/demo/reset` to wipe all demo and non-active records, ensuring clean first-run experience. Tests must use an isolated temp SQLite database, never touching `trustpay.db`.
2. **Stats Discrepancies**:
   - Dashboard cards previously calculated different sums than ledger records.
   - *Fix*: Create a single centralized stats service `backend/services/stats_service.py` that computes all totals directly from database queries, verified with unit tests.
3. **State Machine Rigor**:
   - State transitions need formal validation so invalid calls (e.g. attempting to fund a `no_deal` application) fail closed with explicit 400 errors.
4. **Legacy Legacy Route Clean-up**:
   - Remove legacy simulated negotiation routes (`/jobs/[id]/negotiate`) that bypass applications.

