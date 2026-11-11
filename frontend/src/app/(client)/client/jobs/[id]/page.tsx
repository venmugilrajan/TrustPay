"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Shield,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  MessageSquare,
  Scale,
  CreditCard,
  FileText,
  DollarSign,
  History,
  FileCode,
  Clock,
  XCircle,
  Sparkles,
} from "lucide-react";
import {
  PageHeader,
  Card,
  StatusChip,
  Button,
  Stepper,
  CriterionCard,
  ScoreRing,
  CodeBlock,
  Modal,
  Textarea,
  CopyableId,
  NextStepCard,
  Skeleton,
} from "@/components/ui";
import ProgressTracker from "@/components/glass/ProgressTracker";
import WhatToDoNow from "@/components/glass/WhatToDoNow";
import GlassButton from "@/components/glass/GlassButton";
import { getJob, approveContract, fileDispute, closeJob, closeApplication, reviseJobBudget, decideApplication, Job, Milestone } from "@/lib/api";

export default function ClientContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  // Approval state
  const [approving, setApproving] = useState(false);
  const [acceptingAppId, setAcceptingAppId] = useState<string | null>(null);

  const handleAcceptCandidateQuote = async (appId: string) => {
    setAcceptingAppId(appId);
    try {
      await decideApplication(appId, "accept", { role: "client" });
      await loadJobData();
    } catch (err: any) {
      alert(`Failed to accept candidate quote: ${err.message || err}`);
    } finally {
      setAcceptingAppId(null);
    }
  };

  // Dispute modal state
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeMilestone, setDisputeMilestone] = useState<Milestone | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  // Close project listing and dismiss proposal states
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closingJob, setClosingJob] = useState(false);
  const [closingAppId, setClosingAppId] = useState<string | null>(null);

  const handleCloseJob = async () => {
    setClosingJob(true);
    try {
      await closeJob(jobId);
      setCloseModalOpen(false);
      await loadJobData();
    } catch (err: any) {
      alert(`Failed to close project listing: ${err.message || err}`);
    } finally {
      setClosingJob(false);
    }
  };

  const handleCloseApplication = async (appId: string) => {
    setClosingAppId(appId);
    try {
      await closeApplication(appId);
      await loadJobData();
    } catch (err: any) {
      alert(`Failed to dismiss candidate proposal: ${err.message || err}`);
    } finally {
      setClosingAppId(null);
    }
  };

  // Revise budget states & handler
  const [reviseModalOpen, setReviseModalOpen] = useState(false);
  const [newMaxBudget, setNewMaxBudget] = useState("");
  const [newPublicEstimate, setNewPublicEstimate] = useState("");
  const [revisingBudget, setRevisingBudget] = useState(false);

  const handleReviseBudget = async () => {
    const val = parseFloat(newMaxBudget);
    if (isNaN(val) || val <= 0) {
      alert("Please enter a valid budget amount.");
      return;
    }
    setRevisingBudget(true);
    try {
      await reviseJobBudget(jobId, {
        new_max_budget: val,
        new_public_estimate: newPublicEstimate.trim() || undefined,
      });
      setReviseModalOpen(false);
      await loadJobData();
    } catch (err: any) {
      alert(`Failed to revise budget: ${err.message || err}`);
    } finally {
      setRevisingBudget(false);
    }
  };

  const loadJobData = async () => {
    try {
      const data = await getJob(jobId);
      setJob(data);
      if (data.contract?.milestones?.length && !selectedMilestoneId) {
        setSelectedMilestoneId(data.contract.milestones[0].id);
      }
    } catch (err) {
      console.warn("Error fetching contract:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobData();
  }, [jobId]);

  const handleClientApprove = async () => {
    setApproving(true);
    try {
      await approveContract(jobId, "client");
      await loadJobData();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setApproving(false);
    }
  };

  const handleOpenDispute = (m: Milestone) => {
    setDisputeMilestone(m);
    setDisputeReason("");
    setDisputeModalOpen(true);
  };

  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeMilestone || !disputeReason.trim()) return;

    setSubmittingDispute(true);
    try {
      await fileDispute(jobId, disputeMilestone.id, {
        raised_by: "client",
        reason: disputeReason,
      });
      setDisputeModalOpen(false);
      await loadJobData();
      router.push(`/client/disputes`);
    } catch (err: any) {
      alert(`Dispute filing error: ${err.message}`);
    } finally {
      setSubmittingDispute(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton height={40} className="w-1/3" />
        <Skeleton height={120} className="w-full" />
        <Skeleton height={300} className="w-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-sm text-content-secondary">Contract not found.</p>
        <Link href="/client">
          <Button variant="outline">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const milestones = job.contract?.milestones || [];
  const activeMilestone =
    milestones.find((m) => m.id === selectedMilestoneId) || milestones[0];

  const isAllMilestonesPaid =
    job.status === "completed" ||
    (milestones.length > 0 && milestones.every((m) => m.status === "passed" || m.status === "paid"));

  // Sort submissions descending by version
  const sortedSubmissions = activeMilestone?.submissions
    ? [...activeMilestone.submissions].sort((a, b) => (b.version || 0) - (a.version || 0))
    : [];

  const activeSubmission =
    (selectedSubmissionId && sortedSubmissions.find((s) => s.id === selectedSubmissionId)) ||
    sortedSubmissions[0] ||
    null;

  const sortedEvaluations = activeSubmission?.evaluations
    ? [...activeSubmission.evaluations].sort(
        (a, b) => new Date(b.evaluated_at || 0).getTime() - new Date(a.evaluated_at || 0).getTime()
      )
    : [];

  const latestEvaluation = sortedEvaluations[0] || null;

  const nextStepExplanation = () => {
    switch (job.status) {
      case "negotiating":
        return "AI Agents are currently negotiating scope and price in alternating rounds. Review the dialogue transcript.";
      case "awaiting_approval":
        return job.client_approved
          ? "You have approved the contract terms. Waiting for the freelancer to review and confirm."
          : "Both agents reached agreement. Review the negotiated milestones below and click Approve to proceed to funding.";
      case "approved":
        return "Contract approved by both parties. Authorize payment with PayPal to lock funds safely in escrow.";
      case "funded":
      case "in_progress":
        return `Funds ($${displayBudget.toFixed(2)} USD) are safely locked in PayPal Escrow. The freelancer is actively building deliverables. Funds are only released when milestones pass AI Judge testing.`;
      case "completed":
        return "All milestones have been verified by the AI Judge and paid via PayPal. Contract successfully completed!";
      case "disputed":
        return "A milestone verdict is under arbitration by the AI Dispute Agent. Review the case file in Disputes.";
      default:
        return "Review contract terms and milestone acceptance criteria.";
    }
  };

  const rawEstimate = parseFloat((job.public_budget_estimate || "").replace(/[^0-9.]/g, "") || "0");
  const displayBudget = Number(job.contract?.total_amount || job.max_budget || rawEstimate || 0);

  const isEscrowFunded = Boolean(
    job.paypal_authorization_id || job.status === "funded" || job.status === "in_progress" || job.status === "completed"
  );

  const allAppsNoDeal =
    (job.applications?.length ?? 0) > 0 &&
    job.applications?.every((a) => a.status === "no_deal" || a.status === "closed");

  const candidateQuotes = (job.applications || []).map((a) => Number(a.preferred_price || 0)).filter((q) => q > 0);
  const minQuote = candidateQuotes.length > 0 ? Math.min(...candidateQuotes) : 0;
  const avgQuote = candidateQuotes.length > 0 ? candidateQuotes.reduce((a, b) => a + b, 0) / candidateQuotes.length : 0;

  // Determine best quote among candidate applications
  const activeCandidateApps = (job.applications || []).filter(
    (a) => (a.status as string) !== "closed" && (a.status as string) !== "rejected" && (a.status as string) !== "thanksgiving"
  );
  const getAppPrice = (a: any) => {
    if (a.contract?.total_amount) return Number(a.contract.total_amount);
    return Number(a.preferred_price || 0);
  };
  let bestQuoteAppId: string | null = null;
  if (activeCandidateApps.length > 0) {
    const sortedByQuote = [...activeCandidateApps].sort((a, b) => {
      const pA = getAppPrice(a);
      const pB = getAppPrice(b);
      if (pA !== pB) return pA - pB;
      return (a.time_needed_days || 999) - (b.time_needed_days || 999);
    });
    bestQuoteAppId = sortedByQuote[0]?.id || null;
  }

  const hasAwaitingFreelancer = (job.applications || []).some(
    (a) => a.status === "awaiting_freelancer_acceptance" || (a.client_accepted && !a.freelancer_accepted)
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={job.title}
        description={job.description}
        backHref="/client"
        backLabel="Back to Client Dashboard"
        badge={<StatusChip status={job.status} role="client" />}
        action={
          <div className="flex items-center gap-3">
            {(job.status === "open" || (job.status === "in_negotiation" && !isEscrowFunded)) && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Sparkles className="w-4 h-4 text-accent-blue" />}
                  onClick={() => {
                    setNewMaxBudget(minQuote > 0 ? minQuote.toString() : "350");
                    setNewPublicEstimate(job.public_budget_estimate || "$250.00 – $750.00 USD");
                    setReviseModalOpen(true);
                  }}
                >
                  Revise Budget
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={<XCircle className="w-4 h-4 text-accent-rose" />}
                  onClick={() => setCloseModalOpen(true)}
                >
                  Close Project Listing
                </Button>
              </>
            )}

            {job.status === "negotiating" && (
              <Link href={`/client/jobs/${job.id}/negotiate`}>
                <Button size="sm" icon={<MessageSquare className="w-4 h-4" />}>
                  View Negotiation Transcript
                </Button>
              </Link>
            )}

            {job.status === "approved" && (
              <Link href={`/client/jobs/${job.id}/fund`}>
                <Button size="sm" icon={<Lock className="w-4 h-4" />}>
                  Fund PayPal Escrow (${displayBudget.toFixed(2)})
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {/* Visual Guided Progress Tracker */}
      <ProgressTracker currentStep={allAppsNoDeal ? "applied" : job.status} />

      {/* AI Market Rate Intelligence & Scope Compromise Advisor (Option B & C) */}
      {allAppsNoDeal && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200">
                    AI Market Intelligence · Price Discovery
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30">
                    Market Gap Detected
                  </span>
                </div>
                <p className="text-xs text-content-secondary leading-relaxed max-w-2xl">
                  {job.applications?.length || 2} verified candidates submitted quotes averaging{" "}
                  <strong className="text-content-primary font-serif font-bold">${avgQuote.toFixed(2)} USD</strong> (Lowest quote:{" "}
                  <strong className="text-content-primary font-serif font-bold">${minQuote.toFixed(2)} USD</strong>). Your current budget cap is{" "}
                  <strong className="text-content-primary font-serif font-bold">${displayBudget.toFixed(2)} USD</strong>.
                </p>
                <p className="text-[11px] text-content-muted leading-relaxed">
                  <strong>Autonomous Recommendation:</strong> Revise your budget cap to match market quotes (e.g. ${minQuote.toFixed(2)} USD) to immediately conclude an agreement, or request a Milestone 1 partial scope delivery.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setNewMaxBudget(minQuote > 0 ? minQuote.toString() : "350");
                  setNewPublicEstimate(job.public_budget_estimate || "$250.00 – $750.00 USD");
                  setReviseModalOpen(true);
                }}
                icon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Revise Budget Cap
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Role-Aware What To Do Now Guidance */}
      <WhatToDoNow
        headline={
          hasAwaitingFreelancer
            ? "Quote Accepted · Waiting for Freelancer Confirmation"
            : job.status === "awaiting_approval"
            ? "Review and approve agreed contract"
            : job.status === "approved"
            ? "Fund safe hold to begin project"
            : isAllMilestonesPaid
            ? "All payment stages completed and released"
            : job.status === "funded" || job.status === "in_progress"
            ? "Money held safely · Waiting for work"
            : job.status === "closed"
            ? "This job listing is closed"
            : allAppsNoDeal
            ? "Listing open · Proposals exceeded budget cap"
            : (job.applications?.length ?? 0) === 0
            ? "Listing open · Waiting for freelancer applications"
            : "Review candidate quotes & proposals"
        }
        explanation={
          hasAwaitingFreelancer
            ? "You accepted this proposal! The freelancer has been notified to review and confirm work acceptance before you fund the safe hold."
            : job.status === "awaiting_approval"
            ? "Both AI agents reached agreement. Review the negotiated payment stages and approve to proceed to safe hold."
            : job.status === "approved"
            ? "Both parties approved. Authorize funds via PayPal so the freelancer can begin building."
            : isAllMilestonesPaid
            ? "All deliverables passed automated sandbox tests. Funds were successfully captured by the freelancer."
            : job.status === "funded" || job.status === "in_progress"
            ? "Funds are securely locked by PayPal. The freelancer is actively building deliverables. You will be notified when code is submitted for automated test checks."
            : job.status === "closed"
            ? "This project listing is closed and no longer accepting new proposals."
            : allAppsNoDeal
            ? "Candidate proposals from Sofia Reyes and Arjun Kumar exceeded your budget. Your listing remains active and open for new freelancer proposals that fit within budget."
            : (job.applications?.length ?? 0) === 0
            ? "Your project is published on the marketplace. Freelancers can review requirements and apply."
            : "Review quotes submitted by candidate freelancers below. You can engage in AI negotiation or click 'Accept Quote & Select' on the best candidate."
        }
        actionLabel={
          job.status === "awaiting_approval" && !job.client_approved
            ? "Approve Contract"
            : job.status === "approved"
            ? "Fund Safe Hold"
            : (job.status === "open" && allAppsNoDeal)
            ? "Revise Budget Cap"
            : undefined
        }
        actionHref={job.status === "approved" ? `/client/jobs/${job.id}/fund` : undefined}
        onActionClick={
          job.status === "awaiting_approval" && !job.client_approved
            ? handleClientApprove
            : (job.status === "open" && allAppsNoDeal)
            ? () => {
                setNewMaxBudget(minQuote > 0 ? minQuote.toString() : "350");
                setNewPublicEstimate(job.public_budget_estimate || "$250.00 – $750.00 USD");
                setReviseModalOpen(true);
              }
            : undefined
        }
        isUrgent={job.status === "awaiting_approval" || job.status === "approved"}
      />

      {/* Prominent Safe Hold Funded Confirmation Banner */}
      {isEscrowFunded && (
        <div className="p-4 bg-accent-emerald/10 border border-accent-emerald/25 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-subtle">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-accent-emerald/15 text-accent-emerald flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-accent-emerald" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-content-primary uppercase tracking-wide">
                  {isAllMilestonesPaid ? "All Payment Stages Released & Settled via PayPal" : "PayPal Safe Hold Active & Protected"}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30">
                  {isAllMilestonesPaid ? "100% Settled" : "PayPal Sandbox Protected"}
                </span>
              </div>
              <p className="text-xs text-content-secondary leading-relaxed max-w-2xl">
                {isAllMilestonesPaid
                  ? `All contract deliverables have been verified by automated tests. Your safe hold payment of $${displayBudget.toFixed(2)} USD has been released to the freelancer via PayPal Orders v2 APIs.`
                  : `Your payment of $${displayBudget.toFixed(2)} USD is securely authorized and held by PayPal. Payouts are released incrementally to the freelancer only as each stage passes automated sandbox verification.`}
              </p>
            </div>
          </div>
          {job.paypal_authorization_id && (
            <div className="shrink-0 bg-surface/90 p-2.5 rounded-xl border border-border text-xs">
              <CopyableId label="PayPal Auth ID" idText={job.paypal_authorization_id} />
            </div>
          )}
        </div>
      )}

      {/* Contract Summary Bar */}
      <Card padding="md" className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-content-muted uppercase tracking-wider text-[11px] font-semibold block">
              {job.contract ? "Agreed Contract Escrow" : "Allocated Client Budget"}
            </span>
            <span className="text-xl font-bold font-serif text-content-primary">
              ${displayBudget.toFixed(2)} USD
            </span>
            {!job.contract && (
              <span className="text-[11px] text-content-muted block mt-0.5">
                (Budget cap for negotiation)
              </span>
            )}
          </div>

          <div>
            <span className="text-content-muted uppercase tracking-wider text-[11px] font-semibold block">
              Contract Deadline
            </span>
            <span className="text-sm font-semibold text-content-primary font-mono mt-1 block">
              {job.contract?.deadline || job.deadline}
            </span>
          </div>

          <div>
            <span className="text-content-muted uppercase tracking-wider text-[11px] font-semibold block">
              PayPal Escrow State
            </span>
            <span className="text-xs font-semibold mt-1 flex items-center gap-1.5">
              {isAllMilestonesPaid ? (
                <span className="text-emerald-700 flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  100% Released & Settled
                </span>
              ) : isEscrowFunded ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  Authorized (Funds Held)
                </span>
              ) : job.status === "approved" ? (
                <span className="text-amber-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Ready to Fund
                </span>
              ) : (
                <span className="text-content-muted">Not Yet Funded</span>
              )}
            </span>
          </div>

          <div>
            <span className="text-content-muted uppercase tracking-wider text-[11px] font-semibold block">
              Approval Status
            </span>
            <span className="text-xs font-semibold mt-1 flex items-center gap-1.5">
              {isAllMilestonesPaid || job.status === "completed" ? (
                <span className="text-emerald-700 flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Completed & Settled
                </span>
              ) : isEscrowFunded || job.client_approved ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Approved & Active
                </span>
              ) : job.status === "awaiting_approval" ? (
                <span className="text-amber-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Action Required: Approve
                </span>
              ) : job.status === "closed" ? (
                <StatusChip status="closed" role="client" />
              ) : allAppsNoDeal ? (
                <span className="text-amber-700 flex items-center gap-1 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Open · Awaiting Matching Proposals
                </span>
              ) : job.applications && job.applications.some((a) => a.status === "negotiating") ? (
                <span className="text-blue-600 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  In Negotiation
                </span>
              ) : (
                <span className="text-content-muted flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-content-muted" />
                  {job.applications && job.applications.length > 0 ? "Under Review" : "Awaiting Applications"}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Client Approval Action Banner */}
        {job.status === "awaiting_approval" && !job.client_approved && (
          <div className="pt-4 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-primary-subtle p-4 rounded-btn border border-[#C5D7CE]">
            <div>
              <p className="text-xs font-semibold text-primary">
                Contract Ready for Your Review
              </p>
              <p className="text-xs text-content-secondary mt-0.5">
                Both AI agents reached agreement. Review the milestones below and approve to prepare escrow funding.
              </p>
            </div>
            <Button size="sm" onClick={handleClientApprove} loading={approving}>
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>Approve Contract as Client</span>
            </Button>
          </div>
        )}

        {/* Technical IDs (Collapsible / Readable) */}
        {job.paypal_authorization_id && (
          <div className="pt-3 border-t border-border-subtle flex flex-wrap items-center gap-3 text-xs">
            <CopyableId label="PayPal Auth ID" idText={job.paypal_authorization_id} />
            {job.paypal_order_id && (
              <CopyableId label="Order ID" idText={job.paypal_order_id} />
            )}
          </div>
        )}
      </Card>

      {/* Applications Received Section */}
      {job.applications && job.applications.length > 0 && (
        <Card padding="md" className="space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div>
              <h3 className="text-sm font-semibold text-content-primary">
                Candidate Applications ({job.applications.length})
              </h3>
              <p className="text-xs text-content-secondary mt-0.5">
                Freelancers who applied to this project. Review proposals and engage in autonomous agent negotiations.
              </p>
            </div>
            <span className="text-xs font-mono text-content-muted">
              {job.applications.filter((a) => a.status === "approved" || a.status === "funded").length} / {job.applications.length} Approved
            </span>
          </div>

          <div className="divide-y divide-border-subtle">
            {job.applications.map((app) => {
              const isBestQuote = app.id === bestQuoteAppId;
              const hasContract = Boolean(app.contract?.total_amount);
              const agreedAmount = Number(app.contract?.total_amount || 0);
              const isThanksgiving = app.status === "thanksgiving";
              const isAwaitingFreelancer =
                app.status === "awaiting_freelancer_acceptance" ||
                (app.client_accepted && !app.freelancer_accepted);
              const canAcceptQuote =
                !app.client_accepted &&
                !isThanksgiving &&
                (app.status as string) !== "approved" &&
                (app.status as string) !== "funded" &&
                (app.status as string) !== "completed" &&
                (app.status as string) !== "closed";

              return (
                <div
                  key={app.id}
                  className={`py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isBestQuote && !isThanksgiving
                      ? "bg-emerald-500/5 -mx-4 px-4 rounded-xl border border-emerald-500/20 my-1"
                      : ""
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-xs text-content-primary">
                        {app.freelancer_name ||
                          (app.freelancer_id === "freelancer_sofia"
                            ? "Sofia Reyes"
                            : "Arjun Kumar")}
                      </span>
                      <span className="text-[11px] text-content-muted">
                        ({(app as any).freelancer_title || "Full-Stack & Systems Engineer"})
                      </span>
                      {isBestQuote && !isThanksgiving && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 flex items-center gap-1 shadow-xs">
                          <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                          Best Quote · Recommended
                        </span>
                      )}
                      {isThanksgiving && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface text-content-muted border border-border flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-content-muted shrink-0" />
                          Thank You Notice Sent
                        </span>
                      )}
                      <StatusChip status={app.status} className="scale-90" />
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-content-secondary">
                      <span>
                        Initial Quote: <strong>${Number(app.preferred_price || 0).toFixed(2)} USD</strong>
                      </span>
                      {hasContract && agreedAmount > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                            Agreed Offer: <strong>${agreedAmount.toFixed(2)} USD</strong> ({app.contract?.milestones?.length || 3} milestones)
                          </span>
                        </>
                      )}
                      <span>·</span>
                      <span>Est. Timeline: <strong>{app.time_needed_days} days</strong></span>
                      {app.skills && (
                        <>
                          <span>·</span>
                          <span>Skills: <strong>{app.skills}</strong></span>
                        </>
                      )}
                    </div>
                    {app.notes && (
                      <p className="text-xs text-content-muted italic line-clamp-1 max-w-md">
                        "{app.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {canAcceptQuote && (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        onClick={() => handleAcceptCandidateQuote(app.id)}
                        loading={acceptingAppId === app.id}
                      >
                        Accept Quote & Select
                      </Button>
                    )}

                    {isAwaitingFreelancer && (
                      <span className="text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-900/30 px-2.5 py-1 rounded border border-amber-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Client Approved · Waiting for Freelancer
                      </span>
                    )}

                    <Link href={`/client/jobs/${job.id}/negotiate?app_id=${app.id}`}>
                      <Button variant="outline" size="sm" icon={<MessageSquare className="w-3.5 h-3.5" />}>
                        {app.status === "funded"
                          ? "Negotiation History"
                          : app.status === "no_deal"
                          ? "View Closed Thread"
                          : "Negotiation Thread"}
                      </Button>
                    </Link>

                    {["negotiating", "no_deal", "pending", "applied"].includes(app.status) &&
                      job.status !== "closed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<XCircle className="w-3.5 h-3.5 text-accent-rose" />}
                          onClick={() => handleCloseApplication(app.id)}
                          loading={closingAppId === app.id}
                          title="Dismiss this candidate's proposal"
                        >
                          Dismiss Proposal
                        </Button>
                      )}

                    {app.status === "approved" && (
                      <Link href={`/client/jobs/${job.id}/fund`}>
                        <Button size="sm" icon={<Lock className="w-3.5 h-3.5" />}>
                          Fund PayPal Escrow (${(app.contract?.total_amount || displayBudget).toFixed(2)})
                        </Button>
                      </Link>
                    )}

                    {app.status === "funded" && (
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Escrow Active
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Milestones Stepper & Deliverable Inspection */}
      {milestones.length === 0 ? (
        <Card padding="lg" className="space-y-6 bg-surface shadow-soft border border-border">
          {allAppsNoDeal ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                  <h3 className="text-base font-serif font-bold text-content-primary">
                    Project Listing is Open · Awaiting Matching Proposals
                  </h3>
                </div>
                <p className="text-xs text-content-secondary mt-0.5">
                  The {job.applications?.length} submitted candidate proposals exceeded your budget cap (${displayBudget.toFixed(2)} USD). Negotiations ended for those proposals, but your listing is active for other proposals.
                </p>
              </div>
              <Link href={`/client/jobs/${job.id}/negotiate`}>
                <Button variant="outline" size="md" icon={<MessageSquare className="w-4 h-4" />}>
                  View Proposal History
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-base font-serif font-bold text-content-primary">
                    Autonomous AI Negotiation Engine
                  </h3>
                </div>
                <p className="text-xs text-content-secondary mt-0.5">
                  Bilateral agents are formulating milestone scopes, payment allocations, and acceptance tests.
                </p>
              </div>
              <Link href={`/client/jobs/${job.id}/negotiate`}>
                <Button size="md" icon={<MessageSquare className="w-4 h-4" />}>
                  Open Live Negotiation Dialogue
                </Button>
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-card bg-surface-subtle border border-border-subtle space-y-2">
              <span className="text-[11px] font-semibold text-primary uppercase block">
                Client AI Agent
              </span>
              <p className="text-xs text-content-secondary leading-relaxed">
                Represents your project scope. Protects your maximum budget (${displayBudget.toFixed(2)} USD) and enforces target delivery deadline ({job.deadline}).
              </p>
            </div>

            <div className="p-4 rounded-card bg-surface-subtle border border-border-subtle space-y-2">
              <span className="text-[11px] font-semibold text-accent uppercase block">
                Freelancer AI Agent
              </span>
              <p className="text-xs text-content-secondary leading-relaxed">
                Represents the technical contractor. Ensures realistic milestone pacing, Docker container test harness setup, and unit test coverage.
              </p>
            </div>

            <div className="p-4 rounded-card bg-surface-subtle border border-border-subtle space-y-2">
              <span className="text-[11px] font-semibold text-amber-600 uppercase block">
                Consensus Mechanism
              </span>
              <p className="text-xs text-content-secondary leading-relaxed">
                Agents execute up to 4 alternating bargaining rounds. Once agreed, a draft contract is produced for your one-click bilateral approval.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Left 4 Cols: Milestone Vertical Stepper */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-content-secondary">
              Milestone Roadmap
            </h3>

            <div className="space-y-3">
              {milestones.map((m, idx) => {
                const isSelected = m.id === activeMilestone?.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMilestoneId(m.id)}
                    className={`p-4 rounded-card border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-surface border-primary shadow-soft"
                        : "bg-surface-subtle border-border-subtle hover:bg-cream-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-content-muted">
                        Milestone {idx + 1} of {milestones.length}
                      </span>
                      {(m.status === "passed" || m.status === "paid") ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-accent-emerald/15 text-accent-emerald border border-accent-emerald/25">
                          <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                          <span>Paid ${Number(m.paid_amount || m.amount).toFixed(2)}</span>
                        </span>
                      ) : m.status === "partial" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-warning/15 text-warning border border-warning/25">
                          <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                          <span>Partial (${Number(m.paid_amount || 0).toFixed(2)})</span>
                        </span>
                      ) : m.status === "failed" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-danger/15 text-danger border border-danger/25">
                          <XCircle className="w-3 h-3 stroke-[2.5]" />
                          <span>Revision Needed</span>
                        </span>
                      ) : m.status === "pending" ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-surface text-content-muted border border-border">
                          Pending Work
                        </span>
                      ) : (
                        <StatusChip status={m.status} role="client" className="scale-90" />
                      )}
                    </div>

                    <h4 className="font-serif font-bold text-sm text-content-primary mt-1">
                      {m.title}
                    </h4>

                    <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-border-subtle">
                      <span className="font-serif font-bold text-content-primary">
                        ${Number(m.amount || 0).toFixed(2)}
                      </span>
                      <span className="text-content-muted font-mono text-[11px]">
                        Due {m.due_date}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 8 Cols: Selected Milestone Details, Criteria & AI Verdict */}
          {activeMilestone && (
            <div className="lg:col-span-8 space-y-6">
              <Card padding="md" className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                      Selected Milestone
                    </span>
                    <h3 className="text-xl font-serif font-bold text-content-primary mt-0.5">
                      {activeMilestone.title}
                    </h3>
                    <p className="mt-1 text-xs text-content-secondary leading-relaxed">
                      {activeMilestone.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-content-muted block">Allocation</span>
                    <span className="text-2xl font-serif font-bold text-content-primary">
                      ${Number(activeMilestone.amount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Acceptance Criteria Checklist */}
                <div className="space-y-3 pt-3 border-t border-border-subtle">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-content-secondary">
                    Agreed Acceptance Criteria
                  </h4>
                  <div className="space-y-2">
                    {activeMilestone.acceptance_criteria.map((c) => (
                      <CriterionCard
                        key={c.id}
                        id={c.id}
                        text={c.text}
                        weight={c.weight}
                      />
                    ))}
                  </div>
                </div>

                {/* AI Judge Evaluation Result (if submitted) */}
                {latestEvaluation ? (
                  <div className="space-y-4 pt-4 border-t border-border-subtle">
                    {/* Revision Switcher when multiple submissions exist */}
                    {sortedSubmissions.length > 1 && (
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-btn bg-surface-subtle border border-border-subtle">
                        <div className="flex items-center gap-2">
                          <History className="w-3.5 h-3.5 text-content-secondary" />
                          <span className="text-xs font-semibold text-content-primary">
                            Submission History:
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {sortedSubmissions.map((s) => {
                              const isLatest = s.version === sortedSubmissions[0].version;
                              const isSelected = activeSubmission?.id === s.id;
                              const evalStatus = s.evaluations?.[0]?.verdict;
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => setSelectedSubmissionId(s.id)}
                                  className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1.5 ${
                                    isSelected
                                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                      : "bg-surface text-content-secondary hover:text-content-primary border border-border-subtle"
                                  }`}
                                >
                                  <span>v{s.version}</span>
                                  {isLatest && <span className="text-[10px] font-sans uppercase font-bold">(Latest)</span>}
                                  {evalStatus && (
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        evalStatus === "pass"
                                          ? "bg-success"
                                          : evalStatus === "partial"
                                          ? "bg-warning"
                                          : "bg-danger"
                                      }`}
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <span className="text-[11px] text-content-muted">
                          Viewing Revision #{activeSubmission?.version || 1}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-content-secondary">
                          AI Judge Verdict & Evidence
                        </h4>
                        {activeSubmission && (
                          <p className="text-xs text-content-muted">
                            Evaluation for Revision #{activeSubmission.version}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusChip status={latestEvaluation.verdict} />
                        {(latestEvaluation.sandbox_evidence?.executed === false || latestEvaluation.sandbox_evidence?.runner_mode === "disabled") && (
                          <span className="px-2 py-0.5 text-xs font-mono rounded bg-cream-200 text-content-secondary border border-border-subtle">
                            Tests were not executed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Needs Manual Review Alert if Fail-Closed was triggered */}
                    {activeMilestone.status === "needs_manual_review" && (
                      <div className="p-3.5 rounded-card bg-warning-bg border border-warning-border text-xs text-warning space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>Sandbox Execution Refused (Fail-Closed)</span>
                        </div>
                        <p className="leading-relaxed">
                          Isolated sandbox execution failed closed to protect the host environment. Milestone marked as <strong>Needs Manual Review</strong>. No escrow funds have been released.
                        </p>
                      </div>
                    )}

                    {/* Submitted Content Preview */}
                    {activeSubmission && (
                      <div className="p-3.5 rounded-card bg-cream-100 border border-border space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-content-primary flex items-center gap-1.5">
                            <FileCode className="w-3.5 h-3.5 text-primary" />
                            Deliverable Evaluated (Revision #{activeSubmission.version} - {activeSubmission.submission_type}):
                          </span>
                          <span className="text-[11px] text-content-muted">
                            {new Date(activeSubmission.submitted_at).toLocaleString()}
                          </span>
                        </div>
                        {activeSubmission.file_path && (
                          <p className="text-xs font-mono text-content-secondary">
                            File: {activeSubmission.file_path.split(/[\\/]/).pop()}
                          </p>
                        )}
                        {activeSubmission.content_text && (
                          <pre className="p-2.5 rounded bg-surface border border-border-subtle text-xs font-mono text-content-primary whitespace-pre-wrap max-h-40 overflow-y-auto">
                            {activeSubmission.content_text}
                          </pre>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-6 p-4 rounded-card bg-surface-subtle border border-border-subtle">
                      <ScoreRing score={latestEvaluation.overall_score} size={84} />
                      <div className="flex-1 space-y-1">
                        <span className="text-xs font-bold text-content-primary">
                          Judge Feedback:
                        </span>
                        <p className="text-xs text-content-secondary leading-relaxed italic">
                          &quot;{latestEvaluation.feedback_for_freelancer}&quot;
                        </p>
                      </div>
                    </div>

                    {/* Per-Criterion Detailed Scores */}
                    {latestEvaluation.per_criterion_results && (
                      <div className="space-y-2">
                        <span className="text-xs font-medium text-content-secondary block">
                          Per-Criterion Test Results:
                        </span>
                        {latestEvaluation.per_criterion_results.map((cr, idx) => (
                          <CriterionCard
                            key={idx}
                            id={cr.id || String(idx)}
                            text={cr.text || `Criterion #${idx + 1}`}
                            passed={cr.passed}
                            score={cr.score}
                            reasoning={cr.reasoning}
                            evidence={cr.evidence}
                          />
                        ))}
                      </div>
                    )}

                    {/* Sandbox Terminal Logs or Disabled Notice */}
                    {latestEvaluation.sandbox_evidence?.stdout ? (
                      <CodeBlock
                        title={`Sandbox Execution Logs (${latestEvaluation.sandbox_evidence.provider || latestEvaluation.sandbox_evidence.runner_mode || "isolated"})`}
                        code={latestEvaluation.sandbox_evidence.stdout}
                      />
                    ) : (latestEvaluation.sandbox_evidence?.executed === false || latestEvaluation.sandbox_evidence?.runner_mode === "disabled") ? (
                      <div className="p-3.5 rounded-card bg-cream-100 border border-border-subtle text-xs text-content-secondary flex items-center justify-between">
                        <span className="font-mono font-medium">Tests were not executed</span>
                        <span className="text-[11px] text-content-muted">Static AI criteria review only (Sandbox provider disabled)</span>
                      </div>
                    ) : null}

                    {/* Dispute Action Button */}
                    <div className="pt-2 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDispute(activeMilestone)}
                        className="text-danger hover:bg-danger-bg hover:border-danger-border"
                      >
                        Raise Dispute on this Milestone
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-border-subtle text-center py-6 text-xs text-content-muted">
                    No deliverable submitted for this milestone yet. The freelancer will upload code/assets here for AI Judge evaluation.
                  </div>
                )}
              </Card>

              {/* All Milestones Paid Summary Banner */}
              {isAllMilestonesPaid && (
                <Card padding="md" className="bg-emerald-50/70 border-emerald-300 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-serif font-bold text-emerald-950">
                        Contract Fully Completed & Settled
                      </h4>
                      <p className="text-xs text-emerald-800">
                        All milestones have been verified with 100% scores and payouts settled via PayPal Orders v2.
                      </p>
                    </div>
                  </div>
                  <Link href="/client/payments">
                    <Button size="sm" variant="outline" icon={<ArrowRight className="w-3.5 h-3.5 ml-1 order-last" />}>
                      View Payments Ledger
                    </Button>
                  </Link>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dispute Modal Dialog */}
      <Modal
        isOpen={disputeModalOpen}
        onClose={() => setDisputeModalOpen(false)}
        title="Raise Milestone Dispute"
        description="The autonomous Dispute Agent will evaluate the contract, sandbox evidence, and arguments from both sides."
      >
        <form onSubmit={handleSubmitDispute} className="space-y-4">
          <div className="text-xs bg-cream-100 p-3 rounded-btn border border-border-subtle space-y-1">
            <span className="font-semibold text-content-primary block">
              Milestone: {disputeMilestone?.title}
            </span>
            <span className="text-content-secondary block font-serif">
              Disputed Amount: ${Number(disputeMilestone?.amount || 0).toFixed(2)} USD
            </span>
          </div>

          <Textarea
            label="Reason for Dispute"
            placeholder="Explain why you disagree with the Judge verdict or work delivered..."
            rows={4}
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            helperText="Provide specific factual reasons. The Dispute Agent uses this to deliver a binding ruling."
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDisputeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              loading={submittingDispute}
            >
              Submit Dispute to AI Agent
            </Button>
          </div>
        </form>
      </Modal>

      {/* Close Project Listing Confirmation Modal */}
      <Modal
        isOpen={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        title="Close Project Listing"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-accent-rose/10 border border-accent-rose/20 rounded-xl text-xs flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-accent-rose shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-content-primary">Close project and archive proposals?</p>
              <p className="text-content-secondary leading-relaxed">
                Closing this project listing immediately stops accepting any further applications from freelancers. Any existing unmatched proposals will be archived. You can post a new project listing whenever you are ready.
              </p>
            </div>
          </div>
          <p className="text-xs text-content-secondary">
            Project: <strong className="text-content-primary">"{job.title}"</strong>
          </p>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCloseModalOpen(false)}
              disabled={closingJob}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              icon={<XCircle className="w-4 h-4" />}
              onClick={handleCloseJob}
              loading={closingJob}
            >
              Confirm & Close Listing
            </Button>
          </div>
        </div>
      </Modal>

      {/* Revise Project Budget Cap Modal (Option B) */}
      <Modal
        isOpen={reviseModalOpen}
        onClose={() => setReviseModalOpen(false)}
        title="Revise Project Budget Cap"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-accent-blue/10 border border-accent-blue/20 rounded-xl text-xs space-y-1.5">
            <p className="font-semibold text-accent-blue flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>Marketplace Price Discovery</span>
            </p>
            <p className="text-content-secondary leading-relaxed">
              Updating your budget cap allows your Client AI Agent to re-evaluate previously submitted proposals. If your new budget meets their price floor, agreement can be reached autonomously without reposting!
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-content-primary block mb-1">
                New Maximum Budget Ceiling (USD) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-content-muted font-bold">$</span>
                <input
                  type="number"
                  className="w-full pl-8 pr-3 py-2 text-sm bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-blue/40"
                  placeholder="e.g. 350"
                  value={newMaxBudget}
                  onChange={(e) => setNewMaxBudget(e.target.value)}
                />
              </div>
              <p className="text-[11px] text-content-muted mt-1">
                Private ceiling: Your agent will not agree to any contract above this amount.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-content-primary block mb-1">
                Updated Public Range (Freelancers See)
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-blue/40"
                placeholder="e.g. $250.00 – $750.00 USD"
                value={newPublicEstimate}
                onChange={(e) => setNewPublicEstimate(e.target.value)}
              />
              <p className="text-[11px] text-content-muted mt-1">
                Range displayed on marketplace to guide future freelancer proposals.
              </p>
            </div>
          </div>

          {/* Real-time Match Insight */}
          {parseFloat(newMaxBudget || "0") >= minQuote && minQuote > 0 && (
            <div className="p-3 rounded-xl bg-accent-emerald/10 border border-accent-emerald/25 text-xs text-accent-emerald flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold">Candidate Quote Matched!</p>
                <p className="text-[11px] text-content-secondary leading-relaxed">
                  Sofia Reyes previously quoted <strong>${minQuote.toFixed(2)} USD</strong>. Saving this new budget cap of <strong>${parseFloat(newMaxBudget).toFixed(2)} USD</strong> will re-open her proposal and enable your AI agent to reach an autonomous agreement!
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setReviseModalOpen(false)}
              disabled={revisingBudget}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleReviseBudget}
              loading={revisingBudget}
              icon={<Sparkles className="w-4 h-4" />}
            >
              Save & Re-Evaluate Candidates
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

