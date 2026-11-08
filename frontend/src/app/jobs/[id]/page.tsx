"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Scale,
  DollarSign,
  Send,
  Upload,
  RefreshCw,
  ExternalLink,
  Lock,
  Play,
  ArrowLeft,
  Flame,
  FileCheck,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Job, Milestone, NegotiationTurn, AuditLog, fetchJson } from "@/lib/api";

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const jobId = unwrappedParams.id;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"milestones" | "negotiation" | "timeline" | "dispute">("milestones");
  const [negotiating, setNegotiating] = useState(false);
  const [funding, setFunding] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);

  // Deliverable submission state
  const [selectedMilestone, setSelectedMilestone] = useState<string>("");
  const [submissionType, setSubmissionType] = useState<string>("code");
  const [contentText, setContentText] = useState<string>("");
  const [submittingDeliverable, setSubmittingDeliverable] = useState(false);

  // Dispute state
  const [disputeMilestoneId, setDisputeMilestoneId] = useState<string>("");
  const [disputeReason, setDisputeReason] = useState<string>("");
  const [disputing, setDisputing] = useState(false);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);

  // User role (client vs freelancer)
  const [role, setRole] = useState<"client" | "freelancer">("client");

  const loadJob = async () => {
    try {
      const data = await fetchJson<Job>(`/jobs/${jobId}`);
      setJob(data);
      if (data.contract?.milestones?.length && !selectedMilestone) {
        setSelectedMilestone(data.contract.milestones[0].id);
      }
    } catch (err) {
      console.error("Failed to load job:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJob();
    const storedRole = localStorage.getItem("trustpay_role") as "client" | "freelancer";
    if (storedRole) setRole(storedRole);

    const onRoleChange = () => {
      const updated = localStorage.getItem("trustpay_role") as "client" | "freelancer";
      if (updated) setRole(updated);
    };
    window.addEventListener("role_changed", onRoleChange);
    return () => window.removeEventListener("role_changed", onRoleChange);
  }, [jobId]);

  // Stepping or advancing negotiation
  const handleNegotiate = async (runAll: boolean = false) => {
    setNegotiating(true);
    try {
      await fetchJson(`/jobs/${jobId}/negotiate?run_all=${runAll}`, { method: "POST" });
      await loadJob();
    } catch (err: any) {
      alert(`Negotiation error: ${err.message}`);
    } finally {
      setNegotiating(false);
    }
  };

  // Approving contract
  const handleApprove = async () => {
    try {
      await fetchJson(`/jobs/${jobId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      await loadJob();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  // Fund job via PayPal
  const handleFund = async () => {
    setFunding(true);
    try {
      const fundRes = await fetchJson<{ order_id: string; approve_url?: string }>(`/jobs/${jobId}/fund`, {
        method: "POST",
      });

      // Authorize order immediately in sandbox/demo flow
      setAuthorizing(true);
      await fetchJson(`/jobs/${jobId}/authorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: fundRes.order_id }),
      });

      await loadJob();
      alert("PayPal Sandbox Order Created & Authorized! Funds are held in escrow.");
    } catch (err: any) {
      alert(`Funding error: ${err.message}`);
    } finally {
      setFunding(false);
      setAuthorizing(false);
    }
  };

  // Submit deliverable
  const handleSubmitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMilestone) return;

    setSubmittingDeliverable(true);
    try {
      const formData = new FormData();
      formData.append("submission_type", submissionType);
      formData.append("content_text", contentText);

      await fetch(`http://localhost:8000/api/jobs/${jobId}/milestones/${selectedMilestone}/submit`, {
        method: "POST",
        body: formData,
      });

      setContentText("");
      await loadJob();
      alert("Deliverable submitted and evaluated by AI Judge!");
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setSubmittingDeliverable(false);
    }
  };

  // Raise dispute
  const handleRaiseDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeMilestoneId || !disputeReason) return;

    setDisputing(true);
    try {
      await fetchJson(`/jobs/${jobId}/milestones/${disputeMilestoneId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raised_by: role,
          reason: disputeReason,
        }),
      });

      setDisputeModalOpen(false);
      setDisputeReason("");
      await loadJob();
      setActiveTab("dispute");
      alert("Dispute resolved by Dispute Agent! Check the arbitration ruling.");
    } catch (err: any) {
      alert(`Dispute error: ${err.message}`);
    } finally {
      setDisputing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500" />
        <p>Loading contract details...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold">Job not found</h2>
        <Link href="/dashboard" className="mt-4 inline-block text-blue-500">Return to Dashboard</Link>
      </div>
    );
  }

  const activeMilestone = job.contract?.milestones.find((m) => m.id === selectedMilestone);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-4 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Escrows</span>
      </Link>

      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-md mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/20">
                {job.status.toUpperCase()}
              </span>
              {job.paypal_status === "AUTHORIZED" && (
                <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center space-x-1">
                  <Lock className="w-3 h-3" />
                  <span>PayPal Funds Held</span>
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {job.title}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
              {job.description}
            </p>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-wrap items-center gap-4 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800/80 pt-4 lg:pt-0 lg:pl-8">
            <div>
              <div className="text-xs uppercase text-slate-400 font-semibold">Agreed Escrow</div>
              <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
                ${job.contract?.total_amount ? job.contract.total_amount.toFixed(2) : job.max_budget.toFixed(2)}
              </div>
            </div>

            {/* Approval / Fund action button */}
            {job.status === "awaiting_approval" && (
              <button
                onClick={handleApprove}
                className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve as {role.toUpperCase()}</span>
              </button>
            )}

            {job.status === "approved" && (
              <button
                onClick={handleFund}
                disabled={funding || authorizing}
                className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl bg-gradient-to-r from-[#003087] via-[#0070BA] to-teal-400 hover:shadow-lg hover:shadow-blue-500/20 text-white transition flex items-center space-x-2"
              >
                <DollarSign className="w-4 h-4" />
                <span>{funding ? "Creating Order..." : authorizing ? "Authorizing..." : "Authorize with PayPal Sandbox"}</span>
              </button>
            )}
          </div>
        </div>

        {/* PayPal IDs Strip */}
        {job.paypal_authorization_id && (
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-6 text-xs text-slate-400 font-mono">
            <div>
              PayPal Auth ID: <strong className="text-sky-400 font-semibold">{job.paypal_authorization_id}</strong>
            </div>
            <div>
              Order ID: <strong className="text-slate-300">{job.paypal_order_id}</strong>
            </div>
            <div>
              Intent: <strong className="text-emerald-400">AUTHORIZE (Held, Not Captured)</strong>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 gap-2">
        <button
          onClick={() => setActiveTab("milestones")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
            activeTab === "milestones"
              ? "border-blue-500 text-blue-600 dark:text-sky-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Milestones & Submissions
        </button>
        <button
          onClick={() => setActiveTab("negotiation")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
            activeTab === "negotiation"
              ? "border-blue-500 text-blue-600 dark:text-sky-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          AI Agent Dialogue ({job.negotiation_turns?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("timeline")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
            activeTab === "timeline"
              ? "border-blue-500 text-blue-600 dark:text-sky-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          PayPal & Audit Timeline
        </button>
        {job.contract?.milestones?.some((m) => m.disputes?.length > 0) && (
          <button
            onClick={() => setActiveTab("dispute")}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              activeTab === "dispute"
                ? "border-purple-500 text-purple-600 dark:text-purple-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Dispute Arbitration
          </button>
        )}
      </div>

      {/* TAB 1: MILESTONES & SUBMISSIONS */}
      {activeTab === "milestones" && (
        <div className="space-y-8">
          {/* Milestone Selection Tabs */}
          {job.contract?.milestones ? (
            <div className="grid md:grid-cols-2 gap-6">
              {job.contract.milestones.map((m, idx) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedMilestone(m.id)}
                  className={`p-6 rounded-2xl cursor-pointer transition border ${
                    selectedMilestone === m.id
                      ? "bg-white dark:bg-[#131b2e] border-blue-500 shadow-md ring-1 ring-blue-500/50"
                      : "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-400"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-slate-400">MILESTONE #{idx + 1}</span>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-300">
                      {m.status.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{m.title}</h3>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-2">{m.description}</p>

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400">Amount: </span>
                      <strong className="text-slate-900 dark:text-white font-mono text-sm">${m.amount.toFixed(2)}</strong>
                    </div>
                    {m.captured_amount > 0 && (
                      <div className="text-emerald-500 font-semibold">
                        Captured: ${m.captured_amount.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
              <p className="text-sm text-slate-400">Milestones are being negotiated by the agents. Switch to the AI Agent Dialogue tab to watch!</p>
            </div>
          )}

          {/* Active Milestone Work Area */}
          {activeMilestone && (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left 2 Cols: Criteria & Deliverable Upload */}
              <div className="lg:col-span-2 space-y-6">
                {/* Criteria Card */}
                <div className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
                    Acceptance Criteria for {activeMilestone.title}
                  </h3>
                  <div className="space-y-3">
                    {activeMilestone.acceptance_criteria.map((c) => (
                      <div
                        key={c.id}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 flex items-start space-x-3 text-sm"
                      >
                        <FileCheck className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-slate-800 dark:text-slate-200 font-medium">{c.text}</p>
                          <span className="text-[10px] text-slate-400 font-mono">Weight: {(c.weight * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submission Form (for Freelancer) */}
                <div className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                      Submit Deliverable (Freelancer)
                    </h3>
                    <span className="text-xs text-slate-400">Resubmissions: {activeMilestone.resubmission_count}</span>
                  </div>

                  <form onSubmit={handleSubmitDeliverable} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Deliverable Type
                      </label>
                      <select
                        value={submissionType}
                        onChange={(e) => setSubmissionType(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm"
                      >
                        <option value="code">Code / Python Module</option>
                        <option value="document">Technical Document / Specification</option>
                        <option value="text_url">Repository URL / Deployment Link</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Code Content or Submission Notes
                      </label>
                      <textarea
                        rows={6}
                        required
                        value={contentText}
                        onChange={(e) => setContentText(e.target.value)}
                        placeholder="Paste code or deliverable details here for the AI Judge to execute and test..."
                        className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDisputeMilestoneId(activeMilestone.id);
                          setDisputeModalOpen(true);
                        }}
                        className="text-xs text-rose-500 hover:text-rose-600 font-semibold"
                      >
                        Dispute Verdict
                      </button>

                      <button
                        type="submit"
                        disabled={submittingDeliverable}
                        className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 transition flex items-center space-x-2"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{submittingDeliverable ? "Executing Sandbox..." : "Submit to AI Judge"}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Right Col: AI Judge Verdict & Scoring */}
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">AI Judge Verdict</h3>
                    <Scale className="w-5 h-5 text-amber-500" />
                  </div>

                  {activeMilestone.submissions?.length > 0 ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase text-slate-400">Verdict</span>
                          <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                            activeMilestone.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : activeMilestone.status === "partial_approval"
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-rose-500/10 text-rose-500"
                          }`}>
                            {activeMilestone.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                          ${activeMilestone.captured_amount.toFixed(2)} / ${activeMilestone.amount.toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">PayPal Captured Amount</div>
                      </div>

                      {/* Criteria scores */}
                      <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Criterion Evidence
                        </span>
                        {activeMilestone.acceptance_criteria.map((c, i) => (
                          <div key={i} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 text-xs space-y-1">
                            <div className="flex items-center justify-between font-semibold">
                              <span>Criterion #{i + 1}</span>
                              <span className="text-emerald-500 font-mono">PASSED</span>
                            </div>
                            <p className="text-slate-400">{c.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No submissions uploaded yet for this milestone. Submit code to run in Docker container sandbox.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AI AGENT DIALOGUE */}
      {activeTab === "negotiation" && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Chat transcript */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 max-h-[600px] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Autonomous Negotiation Transcript
              </span>
              <div className="flex items-center space-x-2">
                {job.status === "negotiating" && (
                  <>
                    <button
                      onClick={() => handleNegotiate(false)}
                      disabled={negotiating}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-200 transition"
                    >
                      Step 1 Turn
                    </button>
                    <button
                      onClick={() => handleNegotiate(true)}
                      disabled={negotiating}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition flex items-center space-x-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{negotiating ? "Negotiating..." : "Auto-Run Deal"}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {job.negotiation_turns && job.negotiation_turns.length > 0 ? (
              job.negotiation_turns.map((turn, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    turn.agent_role === "client" ? "items-start" : "items-end"
                  }`}
                >
                  <div className="text-[10px] font-mono text-slate-400 mb-1 flex items-center space-x-2">
                    <span className="font-bold uppercase text-blue-400">
                      {turn.agent_role === "client" ? "Client Agent (Buyer)" : "Freelancer Agent (Worker)"}
                    </span>
                    <span>• Round {turn.round_number}</span>
                  </div>
                  <div
                    className={`max-w-xl p-4 rounded-2xl text-xs leading-relaxed ${
                      turn.agent_role === "client"
                        ? "bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 rounded-tl-sm border border-slate-200 dark:border-slate-700/60"
                        : "bg-blue-600 text-white rounded-tr-sm shadow-md shadow-blue-500/10"
                    }`}
                  >
                    {turn.message}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                Click &quot;Auto-Run Deal&quot; to prompt both agents into negotiation!
              </div>
            )}
          </div>

          {/* Live Contract Preview */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Agreed Contract Draft</h3>
            {job.contract ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-400">Total Contract Value</div>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                    ${job.contract.total_amount.toFixed(2)} {job.contract.currency}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-slate-400 block">Milestone Allocation</span>
                  {job.contract.milestones.map((m, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 flex justify-between">
                      <span className="font-medium text-slate-200">{m.title}</span>
                      <span className="font-mono font-bold">${m.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Contract will materialize once both agents agree on terms.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TIMELINE & PAYPAL AUDIT */}
      {activeTab === "timeline" && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Live PayPal & State Audit Timeline
            </h3>
            <span className="text-xs font-mono text-slate-500">{job.audit_logs?.length || 0} Events Logged</span>
          </div>

          <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-6">
            {job.audit_logs?.map((log, idx) => (
              <div key={idx} className="relative group">
                <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-blue-500 ring-4 ring-white dark:ring-[#131b2e]" />
                <div className="flex items-center space-x-2 text-xs">
                  <span className="font-bold font-mono text-blue-600 dark:text-sky-400">{log.event_type}</span>
                  <span className="text-slate-500">• Actor: <strong className="uppercase">{log.actor}</strong></span>
                  <span className="text-slate-400">• {new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="mt-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 text-xs font-mono text-slate-300">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DISPUTE ARBITRATION */}
      {activeTab === "dispute" && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Binding Dispute Arbitration Records</h3>
          {job.contract?.milestones?.flatMap((m) => m.disputes || []).map((d, i) => (
            <div key={i} className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-rose-500">DISPUTE RAISED BY {d.raised_by.toUpperCase()}</span>
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  RULING: {d.ruling?.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-slate-300 font-medium">&quot;{d.reason}&quot;</p>
              <div className="p-4 rounded-xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                <div className="font-bold text-slate-200">Dispute Agent Rationale:</div>
                <p className="text-slate-400 leading-relaxed">{d.reasoning}</p>
                <div className="pt-2 flex items-center space-x-6 text-xs font-mono font-bold">
                  <span className="text-emerald-400">Captured to Worker: ${d.amount_to_capture?.toFixed(2)}</span>
                  <span className="text-sky-400">Refunded to Client: ${d.amount_to_refund?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dispute Modal */}
      {disputeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Raise Milestone Dispute</h3>
            <p className="text-xs text-slate-400">
              The Dispute Agent will inspect the contract terms, code submission, and Judge rationale to issue a binding PayPal payout/refund ruling.
            </p>
            <form onSubmit={handleRaiseDispute} className="space-y-4">
              <textarea
                required
                rows={4}
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Explain why you are disputing the verdict..."
                className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setDisputeModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disputing}
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition"
                >
                  {disputing ? "Arbitrating..." : "Submit Dispute"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
