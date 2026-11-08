# TrustPay Demo Video Script (2:45)
**PayPal AI Hackathon (Devpost)**

---

### [0:00 - 0:15] The Problem & Introduction
- **Visual**: Split screen showing an unpaid student freelancer staring at an ignored invoice, and an enterprise client receiving broken code from an anonymous developer.
- **Narrator / Voiceover**:
  > "Freelancers and students face an epidemic of unpaid invoices. At the same time, clients fear paying upfront for broken code.
  > Welcome to **TrustPay**: where autonomous AI agents negotiate your freelance contract, PayPal holds the money in secure authorization escrow, and an AI Judge inspects the work to release payments milestone by milestone."

---

### [0:15 - 0:55] AI Multi-Agent Negotiation
- **Visual**: Screen capture on TrustPay. User creates a job: *"Zero-Knowledge Identity Verification Module ($1,400 max budget)"*. User clicks *"Start AI Negotiation"*. The transcript streams in real-time.
- **Narrator**:
  > "The client posts a job with a simple description and budget. Immediately, two specialized AI agents step in.
  > The **Client Agent** protects the buyer's budget and demands strict automated acceptance criteria with test weights.
  > The **Freelancer Agent** advocates for the worker, negotiating fair pay and realistic deadlines.
  > Watch them alternate turns in real-time: adhering to a mandatory minimum of three rounds of rigorous counter-offers and price rationales, they converge on a balanced $1,300 agreement split into two verified milestones. Notice how milestone sums strictly equal the total amount.
  > Both the client and freelancer inspect the contract and click **Approve**."

---

### [0:55 - 1:25] Funding via PayPal Orders v2 Sandbox
- **Visual**: Click *"Authorize with PayPal Sandbox"*. The official PayPal checkout popup appears. Buyer approves the authorization. TrustPay dashboard updates to show **Funds Held (AUTHORIZED)** with PayPal Authorization ID and expiration countdown.
- **Narrator**:
  > "Now, PayPal takes center stage. TrustPay creates a PayPal Order with `intent: AUTHORIZE`.
  > The client approves the order in the PayPal Sandbox popup.
  > Crucially, **money is not captured yet**—it is placed in an official PayPal authorization hold. The worker is 100% guaranteed the funds exist, while the client knows their money remains untouched until deliverables pass verification."

---

### [1:25 - 2:15] Submission, Docker Sandbox & AI Judge Verdict
- **Visual**: Switch role to Freelancer. Freelancer submits code for Milestone 1 (*Circom Circuit*). The AI Judge executes the code inside our isolated container sandbox, running test vectors. Show live scoring results: 0.96 / 1.0 (PASS). Show PayPal capture badge: `$600.00 Captured`.
- **Narrator**:
  > "The freelancer submits Milestone 1. The **AI Judge** takes over:
  > Code deliverables run inside an isolated Docker container with memory and timeout limits. Notice that deliverable text is treated strictly as passive data—even if a malicious submission attempts prompt injection, TrustPay detects and penalizes it.
  > The Judge cites concrete test logs and issues an overall score of 0.96.
  > Because the score exceeds 85%, TrustPay immediately triggers a PayPal capture for the exact $600 milestone. If a submission scored partially, say 70%, TrustPay automatically executes a partial capture of $420 and allows one resubmission."

---

### [2:15 - 2:35] AI Dispute Arbitration & Refund Execution
- **Visual**: Show Scenario 3 (Dispute). Client disputes a failing deliverable. The Dispute Agent evaluates both claims against the contract, rules a 40/60 split, and triggers a PayPal refund of $540.00 back to the buyer while voiding remaining holds.
- **Narrator**:
  > "What if a party disagrees? Either party can raise a dispute. The **Dispute Agent** conducts binding arbitration, weighing criteria, sandbox logs, and written arguments.
  > Here, it orders an equitable split: issuing an immediate PayPal refund to the client while capturing the verified portion for the worker. The ruling is final and executed automatically."

---

### [2:35 - 2:45] Impact & Conclusion
- **Visual**: Show the full PayPal Payment & Audit Timeline with immutable logs, then return to the TrustPay landing page.
- **Narrator**:
  > "Every transaction, turn, and capture is logged in an immutable PayPal timeline.
  > TrustPay eliminates friction, ends invoice chasing, and builds trust for the next billion freelance deals. Powered by PayPal Sandbox and high-speed AI reasoning via Groq and Claude."

