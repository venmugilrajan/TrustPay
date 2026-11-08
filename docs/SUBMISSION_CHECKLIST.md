# TrustPay Hackathon Submission Checklist & Guide
**PayPal AI Hackathon 2026 (Devpost)**

This guide walks you through every step needed to submit TrustPay to Devpost and present it to the hackathon judges.

---

## 📋 1. Devpost Submission Details

### Project Name
`TrustPay — Autonomous Escrow & Milestone Verification for AI-Negotiated Deals`

### Tagline / Pitch (under 200 characters)
> Two AI agents negotiate freelance deals, PayPal holds the funds in authorization escrow, and an AI Judge tests deliverables to execute milestone payouts.

### Built With
* `PayPal Orders v2 REST API (intent: AUTHORIZE)`
* `Groq Cloud API (openai/gpt-oss-20b)`
* `Anthropic Claude API (claude-sonnet-5-5)`
* `FastAPI (Python 3.11+)`
* `Next.js 14 (App Router)`
* `Tailwind CSS`
* `SQLAlchemy Async`
* `Docker Sandbox`

### Submission Text
* Open [`docs/DEVPOST.md`](DEVPOST.md).
* Copy and paste the pre-written sections directly into your Devpost submission form (*Inspiration*, *What It Does*, *How We Built It*, *Challenges We Ran Into*, *Accomplishments*, *What We Learned*, *What's Next*).

---

## 🎥 2. Demo Video Recording Guide (2:45)

Follow the narration script in [`docs/DEMO_SCRIPT.md`](DEMO_SCRIPT.md):

1. **[0:00 - 0:15] Problem**:
   * Open the TrustPay landing page (`http://localhost:3000`).
   * Show the header: *"Autonomous Escrow & Milestone Verification"*.
2. **[0:15 - 0:55] AI Negotiation**:
   * Click **"Post a Job"** (`http://localhost:3000/jobs/new`).
   * Fill in: Title: *"Zero-Knowledge Identity Verification Module"*, Budget: `$1,400.00`.
   * Click **"Post Job & Start Negotiation"**.
   * Switch to the **AI Agent Dialogue** tab and click **"Auto-Run Deal"**.
   * Highlight the 3+ rounds of counter-offers and price rationales until consensus is reached at `$1,300.00`.
3. **[0:55 - 1:25] PayPal Authorization Escrow**:
   * Toggle between the **Client** and **Freelancer** roles using the navbar pill to show role gating.
   * Click **Approve as Client** and **Approve as Freelancer**.
   * Switch to **Client** role: Click the golden **PayPal Sandbox** button.
   * Show the PayPal checkout popup and approve the hold.
   * Point out the **"Funds Held (AUTHORIZE)"** badge and the real PayPal Authorization ID.
4. **[1:25 - 2:15] Submission, Docker Sandbox & AI Judge**:
   * Switch to **Freelancer** role.
   * Paste code into the deliverable form and click **"Submit to AI Judge"**.
   * Show the **AI Judge Verdict** panel:
     * Overall Score: **96% (PASS)**.
     * Per-criterion analysis cards (compiler check, snarkjs test vectors).
     * Monospace Docker sandbox terminal stdout log.
     * Captured Amount: **$600.00 Captured via PayPal**.
5. **[2:15 - 2:35] Dispute Arbitration**:
   * Switch to the Dashboard and open the **Arbitrage Bot** scenario (Scenario 3).
   * Show the Dispute tab: prompt injection detected and penalized, Dispute Agent rules a split payout ($360 captured / $540 refunded via PayPal).
6. **[2:35 - 2:45] PayPal Audit Timeline & Wrap-Up**:
   * Show the **Live PayPal Timeline** tab recording every state change and event.
   * End with the final pitch.

---

## 🧪 3. Verifying Live APIs for Judges

Judges can verify live execution in three ways:

1. **Dashboard & Demo Seeding**:
   * Load `http://localhost:3000/dashboard`.
   * Click **"Seed 3 Scenarios"** for instant evaluation of Pass, Partial, and Dispute flows.
2. **Run the Live Flow Script**:
   ```bash
   python scripts/live_paypal_flow.py
   ```
   * Outputs real PayPal Sandbox Order ID, authorization link, and multi-turn Groq negotiation telemetry.
3. **Run the Automated Test Suite**:
   ```bash
   python -m pytest backend/tests/ -v
   ```
   * Runs all 22 tests (100% pass rate).

---

## 🔒 4. Pre-Flight Repository Checklist

* [x] **Secrets**: Ensure `.env` is NOT committed (`.gitignore` includes `.env`).
* [x] **License**: MIT License present in root [`LICENSE`](../LICENSE).
* [x] **Docs**: [`README.md`](../README.md), [`SPEC.md`](../SPEC.md), [`AGENTS.md`](../AGENTS.md) up to date.
* [x] **Deployment**: Render YAML [`render.yaml`](../render.yaml) and Dockerfiles ready.
* [x] **Code Quality**: All 22 tests passing with clean state.

