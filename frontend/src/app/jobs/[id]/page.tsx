"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
  Terminal,
  Check,
  X,
  User,
  Briefcase,
} from "lucide-react";
import { Job, Milestone, NegotiationTurn, AuditLog, fetchJson, Submission, JudgeEvaluation } from "@/lib/api";
import PayPalButton from "@/components/PayPalButton";

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const routeParams = useParams();
  const jobId = (routeParams?.id as string) || params?.id;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"milestones" | "negotiation" | "timeline" | "dispute">("milestones");
  const [negotiating, setNegotiating] = useState(false);

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

  // Submitting milestone deliverable
  const handleSubmitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMilestone) return;

    setSubmittingDeliverable(true);
    try {
      const formData = new FormData();
      formData.append("submission_type", submissionType);
      formData.append("content_text", contentText);

      await fetch(`/api/jobs/${jobId}/milestones/${selectedMilestone}/submit`, {
        method: "POST",
        body: formData,
      });

      setContentText("");
      await loadJob();
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setSubmittingDeliverable(false);
    }
  };

  // Filing a dispute
  const handleRaiseDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeMilestoneId || !disputeReason) return;

    setDisputing(true);
    try {
      await fetchJson(`/jobs/${jobId}/disputes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestone_id: disputeMilestoneId,
          raised_by: role,
          reason: disputeReason,
        }),
      });

      setDisputeModalOpen(false);
      setDisputeReason("");
      setActiveTab("dispute");
      await loadJob();
    } catch (err: any) {
      alert(`Dispute error: ${err.message}`);
    } finally {
      setDisputing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
        <p>Loading contract details...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold">Job not found</h2>
        <Link href="/dashboard" className="mt-4 inline-block text-blue-500">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const activeMilestone = job.contract?.milestones.find((m) => m.id === selectedMilestone);
  const latestSubmission: Submission | undefined =
    activeMilestone?.submissions && activeMilestone.submissions.length > 0
      ? activeMilestone.submissions[activeMilestone.submissions.length - 1]
      : undefined;
  const latestEvaluation: JudgeEvaluation | undefined =
    latestSubmission?.evaluations && latestSubmission.evaluations.length > 0
      ? latestSubmission.evaluations[latestSubmission.evaluations.length - 1]
      : undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top back link & Role indicator */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Escrows</span>
        </Link>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400">Current Role:</span>
          <span className="px-2.5 py-1 rounded-full font-bold uppercase tracking-wider text-[11px] bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-sky-400 border border-slate-300 dark:border-slate-700">
            {role === "client" ? "Buyer / Client" : "Worker / Freelancer"}
          </span>
        </div>
      </div>

      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-md mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/20">
                {job.status.toUpperCase()}
              </span>
              {job.is_demo && (
                <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30">
                  DEMO DATA
                </span>
              )}
              {job.paypal_status === "AUTHORIZED" && (
                <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center space-x-1">
                  <Lock className="w-3 h-3" />
                  <span>PayPal Funds Held (AUTHORIZE)</span>
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

          {/* Quick Metrics & Role-Gated Actions */}
          <div className="flex flex-wrap items-center gap-4 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800/80 pt-4 lg:pt-0 lg:pl-8">
            <div>
              <div className="text-xs uppercase text-slate-400 font-semibold">Agreed Escrow</div>
              <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
                ${job.contract?.total_amount ? job.contract.total_amount.toFixed(2) : job.max_budget.toFixed(2)}
              </div>
            </div>

            {/* Approval Action Gated by Role */}
            {job.status === "awaiting_approval" && (
              <div>
                {role === "client" ? (
                  job.client_approved ? (
                    <span className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>Client Approved (Waiting for Freelancer)</span>
                    </span>
                  ) : (
                    <button
                      onClick={handleApprove}
                      className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition flex items-center space-x-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve as Client</span>
                    </button>
                  )
                ) : (
                  job.freelancer_approved ? (
                    <span className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>Freelancer Approved (Waiting for Client)</span>
                    </span>
                  ) : (
                    <button
                      onClick={handleApprove}
                      className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition flex items-center space-x-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve as Freelancer</span>
                    </button>
                  )
                )}
              </div>
            )}

            {/* Funding Gated by Role: ONLY Client sees funding button */}
            {job.status === "approved" && (
              <div>
                {role === "client" ? (
                  <div className="w-full lg:w-96">
                    <PayPalButton
                      jobId={job.id}
                      totalAmount={job.contract?.total_amount || job.max_budget}
                      currency={job.contract?.currency || "USD"}
                      onAuthorized={() => loadJob()}
                    />
                  </div>
                ) : (
                  <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs">
                    <strong>Freelancer Notice:</strong> Both parties approved! Waiting for Client to authorize PayPal escrow funds.
                  </div>
                )}
              </div>
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
              Intent: <strong className="text-emerald-400">AUTHORIZE (Held in Escrow)</strong>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("milestones")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap ${
            activeTab === "milestones"
              ? "border-blue-500 text-blue-600 dark:text-sky-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Milestones & Submissions
        </button>
        <button
          onClick={() => setActiveTab("negotiation")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap ${
            activeTab === "negotiation"
              ? "border-blue-500 text-blue-600 dark:text-sky-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          AI Agent Dialogue ({job.negotiation_turns?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("timeline")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap ${
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
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap ${
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
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                      m.status === "approved" || m.status === "completed"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : m.status === "partial_approval"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-300"
                    }`}>
                      {m.status.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{m.title}</h3>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-2">{m.description}</p>

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400">Amount: </span>
                      <strong className="text-slate-900 dark:text-white font-mono text-sm">
                        ${m.amount.toFixed(2)}
                      </strong>
                    </div>
                    {m.captured_amount > 0 && (
                      <div className="text-emerald-500 font-semibold font-mono">
                        Captured: ${m.captured_amount.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
              <p className="text-sm text-slate-400">
                Milestones are being negotiated by the agents. Switch to the AI Agent Dialogue tab to watch!
              </p>
            </div>
          )}

          {/* Active Milestone Work Area */}
          {activeMilestone && (
            <div className="grid lg:grid-cols-12 gap-8">
              {/* Left 7 Cols: Criteria & Deliverable Upload Form */}
              <div className="lg:col-span-7 space-y-6">
                {/* Acceptance Criteria Card */}
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
                          <span className="text-[10px] text-slate-400 font-mono">
                            Weight: {(c.weight * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submission Section: Role Gated */}
                {role === "freelancer" ? (
                  <div className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                        Submit Deliverable (Worker / Freelancer)
                      </h3>
                      <span className="text-xs text-slate-400 font-mono">
                        Resubmissions: {activeMilestone.resubmission_count}
                      </span>
                    </div>

                    <form onSubmit={handleSubmitDeliverable} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                          Deliverable Format
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
                          Deliverable Code or Submission Content
                        </label>
                        <textarea
                          rows={6}
                          required
                          value={contentText}
                          onChange={(e) => setContentText(e.target.value)}
                          placeholder="Paste code or deliverable details here. The AI Judge will execute this in an isolated Docker container with zero network access and score against all criteria..."
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
                          className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 transition flex items-center space-x-2 shadow-md shadow-blue-500/20"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{submittingDeliverable ? "Executing Sandbox..." : "Submit to AI Judge"}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  /* Client Role Notice */
                  <div className="p-6 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 shadow-sm flex items-start space-x-4">
                    <User className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Client Mode Active</h4>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Only the Freelancer submits work for AI Judge evaluation. As the Client, you fund the escrow and review automated test results and arbitration. To submit test code, switch your role to <strong>Freelancer</strong> in the top navigation bar.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right 5 Cols: AI Judge Verdict Panel with per-criterion scores & sandbox logs */}
              <div className="lg:col-span-5 space-y-6">
                <div className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                      AI Judge Verdict & Evidence
                    </h3>
                    <Scale className="w-5 h-5 text-amber-500" />
                  </div>

                  {latestEvaluation ? (
                    <div className="space-y-6">
                      {/* Overall Verdict Banner */}
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase text-slate-400">Verdict</span>
                          <span
                            className={`px-3 py-1 text-xs font-extrabold rounded-full ${
                              latestEvaluation.verdict === "pass"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : latestEvaluation.verdict === "partial"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {latestEvaluation.verdict.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-baseline space-x-2">
                          <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                            {(latestEvaluation.overall_score * 100).toFixed(0)}%
                          </div>
                          <span className="text-xs text-slate-400">Overall Score</span>
                        </div>
                        {latestEvaluation.injection_detected && (
                          <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center space-x-1.5">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>Adversarial Prompt Injection Detected</span>
                          </div>
                        )}
                        <p className="mt-3 text-xs text-slate-400 leading-relaxed italic">
                          &quot;{latestEvaluation.feedback_for_freelancer}&quot;
                        </p>
                      </div>

                      {/* Per-Criterion Results */}
                      <div className="space-y-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                          Per-Criterion Evaluation
                        </span>
                        {latestEvaluation.per_criterion_results?.map((cr, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                                {cr.text || `Criterion #${idx + 1}`}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded font-bold font-mono text-[10px] ${
                                  cr.passed
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                }`}
                              >
                                {cr.passed ? "PASSED" : "FAILED"} ({(cr.score * 100).toFixed(0)}%)
                              </span>
                            </div>
                            <p className="text-slate-400 text-[11px] leading-relaxed">
                              <strong>Reasoning: </strong>
                              {cr.reasoning}
                            </p>
                            {cr.evidence && (
                              <div className="text-[10px] text-slate-500 font-mono bg-black/20 p-1.5 rounded">
                                Evidence: {cr.evidence}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Sandbox Test Execution Output */}
                      {latestEvaluation.sandbox_evidence && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                              <Terminal className="w-3.5 h-3.5 text-teal-400" />
                              <span>Isolated Docker Sandbox</span>
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              Exit: {latestEvaluation.sandbox_evidence.exit_code ?? 0}
                            </span>
                          </div>

                          {latestEvaluation.sandbox_evidence.stdout && (
                            <pre className="p-3 rounded-xl bg-slate-950 text-slate-300 font-mono text-[11px] overflow-x-auto border border-slate-800 leading-relaxed max-h-48 overflow-y-auto">
                              {latestEvaluation.sandbox_evidence.stdout}
                            </pre>
                          )}
                          {latestEvaluation.sandbox_evidence.stderr && (
                            <pre className="p-2.5 rounded-xl bg-rose-950/40 text-rose-300 font-mono text-[10px] overflow-x-auto border border-rose-900/40">
                              {latestEvaluation.sandbox_evidence.stderr}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-400">
                      No deliverables submitted yet for this milestone. When submitted, the AI Judge evaluates the code inside the Docker sandbox with real-time test execution.
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
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 max-h-[650px] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Autonomous Negotiation Dialogue (Min. 3 Rounds)
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
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition flex items-center space-x-1.5 shadow-md shadow-blue-500/20"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
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
                    <span>• Round {turn.round_number} of 6</span>
                    {turn.proposed_price != null && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">
                        Offer: ${turn.proposed_price.toFixed(2)} USD
                      </span>
                    )}
                    {turn.agreed && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                        CONSENSUS REACHED
                      </span>
                    )}
                  </div>
                  <div
                    className={`max-w-xl p-4 rounded-2xl text-xs leading-relaxed ${
                      turn.agent_role === "client"
                        ? "bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 rounded-tl-sm border border-slate-200 dark:border-slate-700/60"
                        : "bg-blue-600 text-white rounded-tr-sm shadow-md shadow-blue-500/10"
                    }`}
                  >
                    <p>{turn.message}</p>
                    {turn.price_change_reason && (
                      <div className="mt-2.5 pt-2 border-t border-slate-300 dark:border-slate-700/60 text-[11px] opacity-90 italic">
                        <strong className="not-italic">Price Rationale: </strong>
                        {turn.price_change_reason}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                Click &quot;Auto-Run Deal&quot; to prompt both agents into multi-round autonomous negotiation!
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
                  <div className="text-[10px] text-slate-500 mt-1">Deadline: {job.contract.deadline}</div>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-slate-400 block">Milestone Allocation</span>
                  {job.contract.milestones.map((m, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 flex justify-between items-center">
                      <span className="font-medium text-slate-200">{m.title}</span>
                      <span className="font-mono font-bold text-blue-400">${m.amount.toFixed(2)}</span>
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
                <div className="mt-1 text-xs text-slate-400 font-mono bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
                  {JSON.stringify(log.details, null, 2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DISPUTE ARBITRATION */}
      {activeTab === "dispute" && (
        <div className="space-y-6">
          {job.contract?.milestones.flatMap((m) => m.disputes || []).map((disp) => (
            <div
              key={disp.id}
              className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-purple-500/30 shadow-md space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Status: {disp.status.toUpperCase()}
                </span>
                <span className="text-xs text-slate-400">Raised By: <strong className="uppercase">{disp.raised_by}</strong></span>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400">Dispute Claim</h4>
                <p className="text-sm text-slate-200 mt-1">{disp.reason}</p>
              </div>

              {disp.ruling && (
                <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/50 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-purple-400 uppercase">AI Dispute Agent Ruling: {disp.ruling}</span>
                    <span className="font-mono text-slate-300">
                      Captured: ${disp.amount_to_capture.toFixed(2)} | Refunded: ${disp.amount_to_refund.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed italic">{disp.reasoning}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dispute Modal */}
      {disputeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Raise Dispute for Arbitration</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The Dispute Agent will evaluate the contract, code deliverable, acceptance criteria, sandbox test logs, and your reason before executing a final PayPal capture/refund.
            </p>

            <form onSubmit={handleRaiseDispute} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Dispute Reason</label>
                <textarea
                  rows={4}
                  required
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="State clearly why the verdict is disputed..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDisputeModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-slate-200 transition"
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
