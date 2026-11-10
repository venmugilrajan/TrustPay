# TrustPay — Autonomous Escrow & Milestone Verification for AI-Negotiated Deals

[![PayPal AI Hackathon](https://img.shields.io/badge/PayPal%20AI%20Hackathon-Devpost-0070BA?style=for-the-badge&logo=paypal)](https://devpost.com)
[![GitHub Repository](https://img.shields.io/badge/GitHub-TrustPay-24493D?style=for-the-badge&logo=github)](https://github.com/venmugilrajan/TrustPay)
[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org)

> **Two AI agents negotiate a freelance deal, PayPal holds the money in authorization escrow, and an AI Judge inspects the work in an isolated sandbox to release payments milestone by milestone.**

---

## 🎯 The Problem
Freelancers and students often don't get paid after completing work. Clients fear losing deposits to unverified developers. Traditional escrow platforms charge steep 10–20% fees and rely on slow human support tickets. 

**TrustPay** replaces counterparty risk with automated trust:
1. **Autonomous Negotiation**: Two AI agents formulate a structured contract with verifiable acceptance criteria.
2. **PayPal Authorization Escrow**: Funds are held via PayPal Orders v2 (`intent: AUTHORIZE`)—money is guaranteed without taking premature custody.
3. **Automated Code & Deliverable Verification**: An isolated Docker sandbox and AI Judge test submissions against acceptance criteria to drive automated full captures, partial payouts, or disputes.

---

## 🎨 Design & Experience
TrustPay features a modern, accessible fintech design system built for maximum clarity and trustworthiness:
- **Palette**: Pure white canvas (`#FFFFFF`), crisp surface panels (`#F7F8FA`), deep navy text (`#0B1F3A`), and emerald accent for escrow protection (`#0E9F6E`).
- **Typography**: Editorial serif (**Fraunces**) for titles and milestone amounts, clean sans-serif (**Inter**) for UI controls, and strict monospace strictly isolated to PayPal transaction IDs and test runner logs.
- **Dual Dedicated Portals**:
  - **Client Portal (`/client/...`)**: Post a Job 3-step wizard with private maximum budget, applicant review, autonomous negotiation thread, PayPal escrow authorization, payment ledger, and disputes.
  - **Freelancer Portal (`/freelancer/...`)**: Available opportunities (with strict privacy protection hiding client maximum budget), private floor application form, deliverable submission workspace, AI Judge score ring, and earnings ledger.
  - **Home Gateway (`/`)**: High-performance animated landing page featuring a 4-phase interactive story simulation loop and role entrance cards.
  - **Demo Hub (`/demo`)**: Standalone evaluator sandbox with 1-click seeding for 3 verified scenarios (Full Capture, Partial Delivery, Active Dispute), reset controls, and single-source-of-truth ledger metrics.

---

## 🏗️ Architecture

```mermaid
flowchart TD
    subgraph Users ["Dual Independent Portals"]
        ClientUser["Client Portal (/client)"]
        FreelancerUser["Freelancer Portal (/freelancer)"]
    end

    subgraph Agents ["Four Specialized AI Agents (Groq & Claude APIs)"]
        CA["Client Agent<br/>(Scope & Budget Advocate)"]
        FA["Freelancer Agent<br/>(Fair Pay & Timeline Advocate)"]
        Judge["Judge Agent<br/>(Criteria & Test Validator)"]
        Dispute["Dispute Agent<br/>(Binding Arbitrator)"]
    end

    subgraph Backend ["FastAPI Core Services"]
        JobRouter["/api/jobs & /api/milestones"]
        LLMService["llm_service.py<br/>(Strict JSON + Anti-Injection)"]
        PayPalService["paypal_service.py<br/>(OAuth Token Cache + Idempotency)"]
        Database[("SQLite / PostgreSQL<br/>SQLAlchemy Async")]
    end

    subgraph SandboxEnv ["Pluggable Isolated Sandbox (FAIL-CLOSED)"]
        Runner["backend/services/sandbox_service.py<br/>(SANDBOX_PROVIDER: e2b | docker | disabled | mock)"]
        E2BProvider["E2B Cloud MicroVM (E2B SDK)<br/>(Disposable microVM per run)"]
        DockerProvider["Docker Container (--network none)<br/>(256MB RAM / 1 CPU / 30s timeout)"]
        DisabledProvider["Disabled Mode<br/>(Static AI review; 'Tests were not executed')"]
    end

    subgraph PayPalSandbox ["PayPal Sandbox API"]
        PPAuth["POST /v2/checkout/orders (AUTHORIZE)"]
        PPCapture["POST /v2/payments/authorizations/{id}/capture"]
        PPVoid["POST /v2/payments/authorizations/{id}/void"]
        PPRefund["POST /v2/payments/captures/{id}/refund"]
    end

    ClientUser -->|1. Post Job Wizard| JobRouter
    JobRouter <-->|2. Alternating Turns| CA
    JobRouter <-->|2. Alternating Turns| FA
    CA <-->|Agree on Milestones| FA

    ClientUser & FreelancerUser -->|3. Approve Contract| JobRouter
    JobRouter -->|4. Create Order| PayPalService
    PayPalService -->|5. Authorize Hold| PPAuth

    FreelancerUser -->|6. Submit Code/Deliverable| JobRouter
    JobRouter -->|7. Execute Tests| Runner
    Runner --> DockerContainer
    DockerContainer -->|Test Logs| Judge
    Judge -->|8. Verdict & Score| JobRouter

    JobRouter -->|Pass >= 0.85: Full Capture| PayPalService
    JobRouter -->|Partial 0.50-0.84: Partial Capture| PayPalService
    PayPalService -->|9. Milestone Payout| PPCapture

    ClientUser & FreelancerUser -.->|Optional Dispute| Dispute
    Dispute -->|Binding Ruling| PayPalService
    PayPalService -->|Refund/Split| PPRefund
```

---

## ✨ Core Technical Highlights
- **Deterministic Contract Invariants**: Milestone amounts must sum strictly to `total_amount` (validated in Pydantic and database constraints).
- **Prompt-Injection Defense**: User deliverables are strictly isolated as passive data inside `<deliverable_data>`. Adversarial attempts to hijack the AI Judge are detected, flagged, and disqualified.
- **PayPal Orders v2 with Intent AUTHORIZE**:
  - `create_order_authorize`: Sets up authorization hold for agreed contract amount.
  - `authorize_order`: Captures PayPal authorization ID; funds held in escrow.
  - `capture_authorization`: Supports multiple partial captures and sets `final_capture: true` on final milestone.
  - `void_authorization`: Automatically voids holds if deadlines pass without delivery.
  - `refund_capture`: Returns disputed funds back to client.

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- (Optional) Docker daemon for containerized sandbox execution

### 1. Clone & Configure Environment
```bash
git clone https://github.com/venmugilrajan/TrustPay.git
cd TrustPay
cp .env.example .env
```
Edit `.env` (TrustPay supports live PayPal sandbox, Groq AI, and pluggable code sandboxes):
```env
# AI Provider (Groq high-speed inference or Claude)
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile

# PayPal Developer Sandbox Credentials
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com

# Pluggable Code Sandbox Provider: "e2b" | "docker" | "disabled" (FAIL CLOSED)
SANDBOX_PROVIDER=disabled
E2B_API_KEY=your_e2b_api_key_here
```

> **Privacy & Execution Note**: When `SANDBOX_PROVIDER=e2b` is configured, deliverable submission code and Judge-generated tests are sent securely to E2B's isolated cloud microVM. If `disabled`, the AI Judge performs static criteria analysis and the UI displays **"Tests were not executed"**. Untrusted code is **NEVER executed on the host system**. If a chosen provider errors or is unavailable, the pipeline strictly **fails closed** and marks the milestone as **Needs Manual Review**.

### 2. Start Backend
```bash
# Install dependencies
python -m pip install -r backend/requirements.txt

# Run FastAPI server
uvicorn backend.main:app --port 8000
```
Backend API will be live at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### 3. Start Frontend
```bash
cd frontend
npm install
npm run build
npm start
```
Frontend will be live at `http://localhost:3000`.

---

## 💳 How Judges Can Test with PayPal Sandbox Accounts

1. **Role Selection & Demo Seeding**:
   - Open `http://localhost:3000`.
   - Choose **"I'm hiring (Client)"** or **"I'm a freelancer"**.
   - Or click **Demo Hub** in the header/footer to seed a pre-negotiated demo contract with 1 click.

2. **Live PayPal Sandbox Testing**:
   - Click **"Post a Job"**, fill in requirements, set budget, and launch negotiation.
   - Watch the Client Agent and Freelancer Agent agree on milestones.
   - Click **"Approve Contract"** as Client, and confirm as Freelancer.
   - Click **"Fund Escrow with PayPal"** — approve via the official PayPal JS SDK popup or click **Quick Sandbox Authorize**.
   - As the Freelancer, submit code/files in **My Work**. The AI Judge runs tests in the sandbox and releases payment via PayPal capture.

3. **Verify via PayPal Smoke Test Script**:
   ```bash
   # Runs Authorize -> Partial Capture ($40) -> Void ($60) against PayPal Sandbox
   python scripts/paypal_smoke_test.py
   ```

---

## 🧪 Testing Suite
TrustPay includes 22 automated tests covering contract invariants, PayPal operations, and agent prompt injection guardrails:
```bash
python -m pytest backend/tests/ -v
```

---

## 📦 Deployment (Render)
TrustPay is configured for Render via [`render.yaml`](file:///r:/Projects/paypal_project/render.yaml):
- **Backend**: Python web service running Uvicorn with SQLite/Postgres.
- **Frontend**: Node.js web service running Next.js 14 SSR/SSG.

---

## 📄 License
This project is licensed under the [MIT License](file:///r:/Projects/paypal_project/LICENSE).
