# TrustPay — Product & Technical Specification
**PayPal AI Hackathon (Devpost)**

## 1. Overview & Problem Statement
- **Problem**: A client wants work done; a freelancer wants guaranteed payment; neither trusts the other. Freelancers risk non-payment; clients risk paying upfront for defective work.
- **Solution**: TrustPay acts as an autonomous trusted middleman:
  1. A client posts a job with private budget constraints and requirements.
  2. Freelancers browse opportunities and apply with private price constraints.
  3. Two AI agents (Client Agent & Freelancer Agent) autonomously negotiate scope, price, milestones, and acceptance criteria based on each user's private brief without leaking limits.
  4. Both humans review the draft contract (Accept, Reject, or Counter).
  5. When both accept, the client puts funds on HOLD in PayPal (authorization intent, not yet captured).
  6. Freelancer submits work milestone by milestone.
  7. AI Judge evaluates work in an isolated Docker sandbox against weighted acceptance criteria.
  8. System executes PayPal payment actions (full capture, partial capture, or resubmission request).
  9. Either party can dispute within 72 hours; Dispute AI issues a binding ruling executed via PayPal.
  10. All money movements and decisions write to an immutable audit ledger (`payments_ledger`).

---

## 2. Tech Stack & Architectural Principles

### Backend
- **Framework**: Python 3.11+, FastAPI (async endpoints, structured exception handlers, JWT auth).
- **ORM & DB**: SQLAlchemy 2.0 (async engine) + Alembic migrations. SQLite for local dev (`trustpay.db`), Postgres-ready via `DATABASE_URL`.
- **Validation**: Pydantic v2 for request/response validation and LLM structured outputs.
- **HTTP Client**: `httpx` for PayPal REST APIs and LLM calls.

### Frontend
- **Framework**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, lucide-react icons.
- **Motion**: Framer Motion for UI animations, Lenis for smooth scroll on the home page.
- **Data Fetching**: SWR / React Query pattern with polling for live updates.
- **Design System**: Premium fintech white/light theme (#FFFFFF background, #F7F8FA soft panels, #0B1F3A brand navy, #0E9F6E emerald). No dark mode, no neon, no gradients on text, no emoji.

### AI Engine & Provider Abstraction
- **Centralized Service**: `backend/services/llm_service.py` is the single point of contact for LLMs.
- **Provider Support**: Default provider `groq` (`GROQ_API_KEY`, `GROQ_MODEL`, e.g. `llama-3.3-70b-versatile`), optional `anthropic` (`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`). Selected via `LLM_PROVIDER`.
- **Output Schema**: Pydantic structured output validation with low temperature (`0.2`) and 2 automatic retries on malformed JSON.
- **Prompt Injection Defense**: All user submitted files, text, and deliverables are treated strictly as **DATA**, wrapped in `<deliverable_data>` tags, never as system instructions. Injection attempts are detected, penalized, and flagged.
- **Leak Scanner**: Agent messages are verified before storage against private limits (`max_budget`, `min_price`). Leaks trigger rejection and regeneration.

### Payments (PayPal Sandbox REST API)
- **Centralized Service**: `backend/services/paypal_service.py` is the ONLY place PayPal APIs are called.
- **Orders v2 REST**:
  - `POST /v2/checkout/orders` with `intent: "AUTHORIZE"`.
  - `POST /v2/checkout/orders/{id}/authorize` to hold funds.
  - `POST /v2/payments/authorizations/{id}/capture` with `final_capture: false/true` for milestone payouts.
  - `POST /v2/payments/authorizations/{id}/void` to release uncaptured holds.
  - `POST /v2/payments/captures/{id}/refund` for dispute refunds.
  - `POST /v2/payments/authorizations/{id}/reauthorize` for extending expired authorizations.
- **Idempotency**: Every PayPal request includes a unique `PayPal-Request-Id`.
- **Amount Integrity**: Amounts are ALWAYS sourced from validated database contracts, never from browser requests.
- **Escrow Accounting**: All dashboard numbers derive from `payments_ledger`.

### Code Sandbox
- **Runner**: Docker-based runner in `sandbox/runner.py`.
- **Parameters**: `--network none`, CPU limit (1 core), memory limit (256MB), 30s timeout, read-only root with temporary directory.
- **Security Policy**: FAIL CLOSED. If Docker is unavailable, execution is refused with a clear error. Code is never run on the host.

---

## 3. Roles, Authentication & Data Visibility

### Roles & Demo Users
- **Client**: Posts jobs, reviews applications, counters/accepts contracts, funds escrow in PayPal, reviews milestone deliverables, raises disputes.
  - Default demo users: `Maya Patel` (`client-maya`), `Northwind Studio` (`client-northwind`).
- **Freelancer**: Browses open opportunities, applies with private minimum price, counters/accepts contracts, submits milestone deliverables, views earnings, raises disputes.
  - Default demo users: `Arjun Kumar` (`freelancer-arjun`), `Sofia Reyes` (`freelancer-sofia`).
- **Auth**: `POST /api/auth/demo-login` issues signed JWT containing `{user_id, role, name, exp}`. All protected endpoints verify the token and enforce ownership.
- **Sign Out / Switch**: UI provides clean sign-out and switch account flows (no fake identity toggles).

### Visibility & Privacy Rules
1. `Job.max_budget`: Strictly private to the client who created the job. Never exposed to freelancers in any API response, UI screen, or agent conversation. Freelancers see only `public_budget_estimate` (text) or "Negotiable".
2. `Application.min_price`: Strictly private to the applicant freelancer. Never exposed to clients in any API response, UI screen, or agent conversation.
3. **Isolation**: A client only sees their own jobs and applications to those jobs. A freelancer only sees open jobs (Opportunities) and their own applications/contracts.
4. **Action Gates**: Only the job owner can fund; only the applicant can submit deliverables; either party can dispute their own contract.

---

## 4. Domain Model & State Machines

### Database Tables
1. `users`: `id`, `name`, `email`, `role` (client | freelancer), `created_at`
2. `jobs`: `id`, `client_id`, `title`, `description`, `deliverables`, `deadline`, `max_budget` (private), `public_budget_estimate` (optional), `currency` (USD), `priorities` (cheap|fast|quality), `must_haves`, `status`, `active_contract_id`, `created_at`, `updated_at`
   - Statuses: `open`, `in_negotiation`, `funding`, `funded`, `in_progress`, `completed`, `cancelled`
3. `applications`: `id`, `job_id`, `freelancer_id`, `min_price` (private), `preferred_price`, `time_needed_days`, `skills`, `exclusions`, `notes`, `status`, `client_accepted`, `freelancer_accepted`, `counters_used` (max 2), `created_at`, `updated_at`
   - Statuses: `negotiating`, `awaiting_decision`, `approved`, `no_deal`, `rejected`, `closed`, `funded`
4. `negotiation_turns`: `id`, `application_id`, `round_number`, `sender` (client_agent | freelancer_agent | client | freelancer), `offer_price`, `timeline_days`, `milestone_summary`, `message`, `raw_payload`, `created_at`
5. `contracts`: `id`, `application_id`, `version`, `total_amount`, `currency`, `deadline`, `status` (draft | approved | funded | in_progress | completed | disputed | cancelled), `paypal_order_id`, `paypal_authorization_id`, `authorized_at`, `expires_at`, `created_at`, `updated_at`
6. `milestones`: `id`, `contract_id`, `index`, `title`, `description`, `amount`, `due_date`, `status`, `resubmissions_used` (max 2), `score`, `paid_amount`, `paypal_capture_id`, `created_at`, `updated_at`
   - Statuses: `pending`, `submitted`, `judging`, `passed`, `partial`, `failed`, `paid`, `disputed`, `refunded`
7. `acceptance_criteria`: `id`, `milestone_id`, `criterion_text`, `weight` (sum = 1.0)
8. `submissions`: `id`, `milestone_id`, `submission_number`, `deliverable_type` (code | text | image), `content`, `file_paths`, `notes`, `created_at`
9. `evaluations`: `id`, `submission_id`, `overall_score`, `verdict` (pass | partial | fail), `criteria_evaluations` (JSON), `feedback_for_freelancer`, `test_stdout`, `test_stderr`, `prompt_injection_flag`, `created_at`
10. `disputes`: `id`, `contract_id`, `milestone_id`, `initiator_id`, `reason`, `client_statement`, `freelancer_statement`, `status` (open | reviewing | resolved), `ruling`, `amount_to_capture`, `amount_to_refund`, `reasoning`, `created_at`, `resolved_at`
11. `payments_ledger`: `id`, `job_id`, `contract_id`, `milestone_id` (nullable), `type` (authorized | captured | voided | refunded | reauthorized), `amount`, `currency`, `paypal_id`, `actor`, `note`, `is_demo`, `created_at`
12. `audit_log`: `id`, `entity_type`, `entity_id`, `action`, `actor`, `details` (JSON), `created_at`
13. `webhook_events`: `id`, `event_id`, `event_type`, `payload` (JSON), `processed_at`

### Integrity Constraints
- `sum(milestone.amount) == contract.total_amount` checked via Pydantic validator and DB integrity checks.
- Every contract version must satisfy: `application.min_price <= contract.total_amount <= job.max_budget`.
- Job atomic funding: `UPDATE jobs SET status = 'funding' WHERE id = :job_id AND status = 'open'`. If rowcount != 1, concurrent funding is blocked with 409 Conflict.
- When PayPal authorization succeeds: set `application.status = 'funded'`, `job.status = 'funded'`, `job.active_contract_id = contract.id`, and close all rival applications (`status = 'closed'`).

---

## 5. End-to-End Operational Lifecycle

1. **Job Posting**: Client completes 3-step wizard (Scope -> Budget & Deadline -> Review). Private `max_budget` stored securely. Job status = `open`.
2. **Opportunities**: Freelancers browse open jobs with public estimate or "Negotiable".
3. **Application**: Freelancer specifies private `min_price`, `preferred_price`, timeline, skills, and pitch notes. Status moves to `negotiating`.
4. **Autonomous Agent Negotiation**:
   - Round 1-6 autonomous dialogue between Client Agent and Freelancer Agent.
   - Agreement not allowed before Round 3.
   - Leak scanner inspects outgoing messages; private limits are never revealed.
   - If `min_price > max_budget`, negotiation halts immediately as `no_deal`.
   - On agreement, structured draft contract is created (version 1). Status = `awaiting_decision`.
5. **Human Review & Counters**:
   - Both parties review draft contract.
   - Options: Accept, Reject, or Counter (max 2 counters per application).
   - Counter triggers a short agent refinement round, creating a new contract version and resetting acceptances.
   - When both Accept -> status = `approved`.
6. **Escrow Funding (PayPal Authorization)**:
   - Client clicks "Pay with PayPal". Server creates order with `intent: AUTHORIZE` for exact approved contract amount.
   - Client approves in PayPal sandbox popup.
   - Server authorizes order, creates `authorized` entry in `payments_ledger`, sets application and job to `funded`, sets `job.active_contract_id`, and closes other applications.
7. **Milestone Delivery & Sandboxed Evaluation**:
   - Freelancer uploads deliverable (code, documentation, files). Milestone status = `submitted` -> `judging`.
   - AI Judge generates test cases and runs them in isolated Docker sandbox (`--network none`, resource limits).
   - Judge produces structured verdict: score >= 0.85 (Pass), 0.50-0.85 (Partial), < 0.50 (Fail).
8. **Automated Payment Actions**:
   - **Pass**: Milestone amount captured via PayPal API. Ledger records `captured`. Status = `paid`.
   - **Partial**: Capture proportional payout `round(amount * score, 2)`. Freelancer offered resubmission (max 2).
   - **Fail**: $0 captured. Feedback provided. Resubmission allowed.
   - Last milestone capture sets `final_capture = true` to release unused hold.
9. **Disputes**:
   - 72-hour window after verdict. Either party may submit dispute with written reasoning.
   - Dispute AI evaluates contract, evidence, judge results, and statements.
   - Issues binding ruling: `{ruling, amount_to_capture, amount_to_refund, reasoning}`.
   - Server executes PayPal transactions and logs to `payments_ledger`.
10. **Completion**: Remaining authorization voided if any; job marked `completed`.

---

## 6. Financial Ledger & Escrow Accounting
All financial figures across both portals are computed dynamically from `payments_ledger`:
- **Funds held in escrow**: $\sum \text{authorized} - \sum \text{captured} - \sum \text{voided} - \sum \text{refunded}$
- **Released to freelancers**: $\sum \text{captured}$
- **Pending verification**: Milestones with status `submitted` or `judging`.
- **Active contracts**: Contracts with status `funded` or `in_progress`.
Formatting: `$1,234.50` with thousand separators and 2 decimal places.

---

## 7. Ambiguity Resolutions & Implementation Decisions
- **LLM Provider Default**: Groq with `llama-3.3-70b-versatile` for fast, cost-effective, high-throughput hackathon execution; Anthropic Claude (`claude-3-5-sonnet-20241022`) fully supported via config.
- **Docker Sandbox Fallback Policy**: Strict FAIL CLOSED. If Docker daemon is unreachable, the test execution returns an explicit error (`Docker sandbox unavailable`) and does not fall back to host execution.
- **Milestone Criteria Weights**: Normalized automatically to sum to 1.0.
- **Authorization Expiry**: PayPal authorizations hold funds for 29 days (with a 3-day honor window). Displayed clearly in UI as "Funds held until <date>". Reauthorization endpoint implemented.
