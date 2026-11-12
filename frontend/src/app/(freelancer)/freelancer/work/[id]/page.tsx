"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Upload,
  CheckCircle2,
  Clock,
  Scale,
  FileCode,
  FileText,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  MessageSquare,
  Lock,
  History,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  PageHeader,
  Card,
  StatusChip,
  Button,
  CriterionCard,
  ScoreRing,
  CodeBlock,
  FileDropzone,
  Textarea,
  Modal,
  CopyableId,
  NextStepCard,
  Skeleton,
} from "@/components/ui";
import {
  getJob,
  approveContract,
  submitMilestoneWork,
  fileDispute,
  Job,
  Milestone,
} from "@/lib/api";

export default function FreelancerContractWorkPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  // Approval state
  const [approving, setApproving] = useState(false);

  // Submission form state & refs
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionType, setSubmissionType] = useState<"code" | "document" | "image" | "url">("code");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isResubmitting, setIsResubmitting] = useState(false);

  const submissionFormRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Dispute modal state
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeMilestone, setDisputeMilestone] = useState<Milestone | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const loadJobData = async () => {
    try {
      const data = await getJob(jobId);
      setJob(data);
      if (data.contract?.milestones?.length && !selectedMilestoneId) {
        setSelectedMilestoneId(data.contract.milestones[0].id);
      }
    } catch (err) {
      console.warn("Failed to load freelancer work:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobData();
  }, [jobId]);

  const handleFreelancerApprove = async () => {
    setApproving(true);
    try {
      await approveContract(jobId, "freelancer");
      await loadJobData();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setApproving(false);
    }
  };

  const handleSubmitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetMilestoneId = activeMilestone?.id || selectedMilestoneId;
    if (!targetMilestoneId) {
      setSubmitError("No active milestone selected.");
      return;
    }

    if (!submissionFile && !submissionText.trim()) {
      setSubmitError("Please provide code/deliverable content or upload a file.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append("submission_type", submissionType);
      formData.append("content_text", submissionText);
      if (submissionFile) {
        formData.append("file", submissionFile);
      }

      const result = await submitMilestoneWork(jobId, targetMilestoneId, formData);
      setSubmissionText("");
      setSubmissionFile(null);
      setIsResubmitting(false);
      setSelectedSubmissionId(null);
      
      // Update job state directly with fresh data
      await loadJobData();

      // Smoothly scroll down to AI Judge Verdict panel
      setTimeout(() => {
        const evalSection = document.getElementById("ai-judge-verdict-section");
        if (evalSection) {
          evalSection.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          window.scrollTo({ top: 350, behavior: "smooth" });
        }
      }, 150);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit deliverable");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFixAndResubmit = (previousContent?: string, previousType?: string) => {
    setIsResubmitting(true);
    if (!submissionText && previousContent) {
      setSubmissionText(previousContent);
    }
    if (previousType && (["code", "document", "image", "url"] as const).includes(previousType as any)) {
      setSubmissionType(previousType as any);
    }
    submissionFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 250);
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
        raised_by: "freelancer",
        reason: disputeReason,
      });
      setDisputeModalOpen(false);
      await loadJobData();
      router.push("/freelancer/disputes");
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

  if (!job) return null;

  const milestones = job.contract?.milestones || [];
  const activeMilestone =
    milestones.find((m) => m.id === selectedMilestoneId) || milestones[0];

  const isMilestonePaid = activeMilestone?.status === "passed" || activeMilestone?.status === "paid";
  const isAllMilestonesPaid =
    job.status === "completed" ||
    (milestones.length > 0 && milestones.every((m) => m.status === "passed" || m.status === "paid"));

  const activeMilestoneIndex = milestones.findIndex((m) => m.id === activeMilestone?.id);
  const nextMilestone =
    activeMilestoneIndex >= 0 && activeMilestoneIndex < milestones.length - 1
      ? milestones[activeMilestoneIndex + 1]
      : null;

  // Sort submissions descending by version (e.g., version 2, version 1)
  const sortedSubmissions = activeMilestone?.submissions
    ? [...activeMilestone.submissions].sort((a, b) => (b.version || 0) - (a.version || 0))
    : [];

  // Active submission is the user-selected version or defaults to latest (index 0)
  const activeSubmission =
    (selectedSubmissionId && sortedSubmissions.find((s) => s.id === selectedSubmissionId)) ||
    sortedSubmissions[0] ||
    null;

  // Sort evaluations descending by evaluated_at
  const sortedEvaluations = activeSubmission?.evaluations
    ? [...activeSubmission.evaluations].sort(
        (a, b) => new Date(b.evaluated_at || 0).getTime() - new Date(a.evaluated_at || 0).getTime()
      )
    : [];

  const activeEvaluation = sortedEvaluations[0] || null;

  const nextStepExplanation = () => {
    switch (job.status) {
      case "negotiating":
        return "Your Freelancer Agent is negotiating terms with the client. Review proposals in Dialogue.";
      case "awaiting_approval":
        return job.freelancer_approved
          ? "You have confirmed the contract terms. Waiting for the client to complete approval."
          : "Both agents reached consensus. Review agreed milestones and click Confirm Contract below.";
      case "approved":
        return "Contract approved! Waiting for the client to authorize PayPal escrow funds before you begin work.";
      case "funded":
      case "in_progress":
        return "Escrow funds are guaranteed by PayPal! Complete the acceptance criteria and submit deliverables for AI Judge verification.";
      case "completed":
        return "All milestones have been verified and released to your account. Contract completed.";
      default:
        return "Review milestone criteria and deliverable requirements.";
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={job.title}
        description={job.description}
        backHref="/freelancer/work"
        backLabel="Back to My Work"
        badge={<StatusChip status={job.status} />}
        action={
          job.status === "negotiating" ? (
            <Link href={`/freelancer/work/${job.id}/negotiate`}>
              <Button size="sm" icon={<MessageSquare className="w-4 h-4" />}>
                View Negotiation Dialogue
              </Button>
            </Link>
          ) : null
        }
      />

      <NextStepCard stepText={nextStepExplanation()} />

      {/* Prominent Escrow Guaranteed Banner for Freelancer */}
      {Boolean(job.paypal_authorization_id || job.status === "funded" || job.status === "in_progress" || job.status === "completed") && (
        <div className="p-4 bg-emerald-50/90 border border-emerald-300 rounded-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-soft">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-inner">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                  {isAllMilestonesPaid ? "All Escrow Payouts Released & Settled via PayPal" : "PayPal Sandbox Guaranteed Escrow"}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-200/80 text-emerald-900 border border-emerald-300">
                  {isAllMilestonesPaid ? "Settled · 100% Paid" : "PayPal Sandbox Protected"}
                </span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed max-w-2xl">
                {isAllMilestonesPaid
                  ? "All project milestones have been evaluated with 100% scores and fully captured via PayPal Orders v2 APIs. Funds have been credited to your account."
                  : "The client has authorized and locked the full contract amount in PayPal escrow. Your earnings are 100% guaranteed—funds are released automatically to your account as you pass each milestone with the AI Judge."}
              </p>
            </div>
          </div>
          {job.paypal_authorization_id && (
            <div className="shrink-0 bg-white/90 p-2.5 rounded border border-emerald-200 text-xs">
              <CopyableId label="PayPal Escrow Auth ID" idText={job.paypal_authorization_id} />
            </div>
          )}
        </div>
      )}

      {/* Contract Financial Snapshot */}
      <Card padding="md" className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-content-muted uppercase tracking-wider text-[11px] font-semibold block">
              {job.contract ? "Total Contract Escrow" : "Target Escrow Estimate"}
            </span>
            <span className="text-xl font-bold font-serif text-primary">
              {job.contract ? (
                `$${Number(job.contract.total_amount || 0).toFixed(2)} USD`
              ) : job.public_budget_estimate ? (
                job.public_budget_estimate.startsWith("$")
                  ? `${job.public_budget_estimate} USD`
                  : job.public_budget_estimate
              ) : (
                "Negotiable"
              )}
            </span>
            {!job.contract && (
              <span className="text-[11px] text-content-muted block mt-0.5">
                (Finalized via AI negotiation)
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
              PayPal Guarantee
            </span>
            <span className="text-xs font-semibold mt-1 flex items-center gap-1.5">
              {isAllMilestonesPaid ? (
                <span className="text-emerald-700 flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  100% Released & Paid
                </span>
              ) : job.paypal_authorization_id ? (
                <span className="text-emerald-700 flex items-center gap-1 font-bold">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  Escrow Locked (Guaranteed)
                </span>
              ) : (
                <span className="text-amber-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Awaiting Authorization
                </span>
              )}
            </span>
          </div>

          <div>
            <span className="text-content-muted uppercase tracking-wider text-[11px] font-semibold block">
              Contract Status
            </span>
            <span className="text-xs font-semibold mt-1 flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {isAllMilestonesPaid || job.status === "completed"
                  ? "Completed & Paid"
                  : job.status === "funded" || job.status === "in_progress"
                  ? "Active · In Progress"
                  : job.freelancer_approved
                  ? "You Confirmed"
                  : "Pending Confirmation"}
              </span>
            </span>
          </div>
        </div>

        {/* Freelancer Confirmation Action Banner */}
        {((job.my_application?.client_accepted || job.status === "awaiting_freelancer_acceptance" || (job.client_approved && !job.freelancer_approved)) && !job.freelancer_approved && !job.my_application?.freelancer_accepted) && (
          <div className="pt-4 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-emerald-500/10 p-4 rounded-btn border border-emerald-500/30">
            <div>
              <p className="text-xs font-semibold text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Client Accepted Your Proposal!</span>
              </p>
              <p className="text-xs text-content-secondary mt-0.5">
                The client approved your quote for &quot;{job.title}&quot;. Review the 3 milestones below and confirm work acceptance.
              </p>
            </div>
            <Button size="sm" variant="primary" onClick={handleFreelancerApprove} loading={approving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              <CheckCircle2 className="w-4 h-4 mr-1.5 text-white" />
              <span>Confirm & Accept Work</span>
            </Button>
          </div>
        )}

        {/* Technical IDs */}
        {job.paypal_authorization_id && (
          <div className="pt-3 border-t border-border-subtle flex flex-wrap items-center gap-3 text-xs">
            <CopyableId label="PayPal Escrow Auth ID" idText={job.paypal_authorization_id} />
          </div>
        )}
      </Card>

      {/* Milestones & Deliverables Submission Area */}
      {milestones.length === 0 ? (
        <Card padding="lg" className="space-y-6 bg-surface shadow-soft border border-border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-base font-serif font-bold text-content-primary">
                  Autonomous AI Negotiation Engine
                </h3>
              </div>
              <p className="text-xs text-content-secondary mt-0.5">
                Your Freelancer AI Agent is negotiating milestone payouts, test criteria, and schedules with the client.
              </p>
            </div>
            <Link href={`/freelancer/work/${job.id}/negotiate`}>
              <Button size="md" icon={<MessageSquare className="w-4 h-4" />}>
                Open Live Negotiation Dialogue
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-card bg-surface-subtle border border-border-subtle space-y-2">
              <span className="text-[11px] font-semibold text-accent uppercase block">
                Freelancer AI Agent
              </span>
              <p className="text-xs text-content-secondary leading-relaxed">
                Advocates for fair pricing, sensible milestone deadlines, and transparent acceptance test rules in the Docker sandbox.
              </p>
            </div>

            <div className="p-4 rounded-card bg-surface-subtle border border-border-subtle space-y-2">
              <span className="text-[11px] font-semibold text-primary uppercase block">
                Client AI Agent
              </span>
              <p className="text-xs text-content-secondary leading-relaxed">
                Represents buyer expectations and verifies target delivery milestones match business requirements.
              </p>
            </div>

            <div className="p-4 rounded-card bg-surface-subtle border border-border-subtle space-y-2">
              <span className="text-[11px] font-semibold text-amber-600 uppercase block">
                Guaranteed Escrow Payouts
              </span>
              <p className="text-xs text-content-secondary leading-relaxed">
                Upon agreement and client approval, funds are locked in PayPal escrow (AUTHORIZE). You get paid automatically as each milestone passes AI testing.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left 4 Cols: Milestone Selector */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-content-secondary">
              Milestone Checklist
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
                        Milestone {idx + 1}
                      </span>
                      {(m.status === "passed" || m.status === "paid") ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Paid ${Number(m.paid_amount || m.amount).toFixed(2)}
                        </span>
                      ) : m.status === "partial" ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          Partial (${Number(m.paid_amount || 0).toFixed(2)})
                        </span>
                      ) : m.status === "failed" ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          Revision Needed
                        </span>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            isSelected
                              ? "bg-blue-100 text-blue-800 border border-blue-300"
                              : "bg-gray-100 text-gray-600 border border-gray-200"
                          }`}
                        >
                          {isSelected ? "Active · Submit Work" : "Upcoming"}
                        </span>
                      )}
                    </div>

                    <h4 className="font-serif font-bold text-sm text-content-primary mt-1">
                      {m.title}
                    </h4>

                    <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-border-subtle">
                      <span className="font-serif font-bold text-primary">
                        ${Number(m.amount || 0).toFixed(2)} USD
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

          {/* Right 8 Cols: Requirements Checklist, Upload Box & Verdict Panel */}
          {activeMilestone && (
            <div className="lg:col-span-8 space-y-6">
              {/* Requirements & Criteria Checklist */}
              <Card padding="md" className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                      Current Milestone Requirements
                    </span>
                    <h3 className="text-xl font-serif font-bold text-content-primary mt-0.5">
                      {activeMilestone.title}
                    </h3>
                    <p className="mt-1 text-xs text-content-secondary leading-relaxed">
                      {activeMilestone.description}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-content-muted block">Payout Allocation</span>
                    <span className="text-2xl font-serif font-bold text-primary">
                      ${Number(activeMilestone.amount || 0).toFixed(2)}
                    </span>
                    {(activeMilestone.status === "passed" || activeMilestone.status === "paid") && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        100% Verified & Paid (${Number(activeMilestone.paid_amount || activeMilestone.amount).toFixed(2)})
                      </span>
                    )}
                    {activeMilestone.status === "partial" && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        Partial Payout Released (${Number(activeMilestone.paid_amount || 0).toFixed(2)})
                      </span>
                    )}
                    {activeMilestone.status === "failed" && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        Revision Required (Score below 80%)
                      </span>
                    )}
                    {activeMilestone.status === "pending" && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-emerald-600" />
                        Escrow Locked: Submit to Release
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-border-subtle">
                  <span className="text-xs font-semibold uppercase tracking-wider text-content-secondary block">
                    Acceptance Criteria Checklist (Tested by AI Judge)
                  </span>
                  {activeMilestone.acceptance_criteria.map((c) => (
                    <CriterionCard
                      key={c.id}
                      id={c.id}
                      text={c.text}
                      weight={c.weight}
                    />
                  ))}
                </div>
              </Card>

              {/* AI Judge Verdict View - Positioned Prominently Above Submission Form */}
              {activeEvaluation && (
                <div id="ai-judge-verdict-section">
                  <Card padding="lg" className="space-y-6 bg-surface shadow-soft border-border-strong ring-1 ring-border">
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
                      <h3 className="text-base font-serif font-bold text-content-primary">
                        AI Judge Verdict & Verification
                      </h3>
                      {activeSubmission && (
                        <p className="text-xs text-content-muted">
                          Evaluation for Revision #{activeSubmission.version}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusChip status={activeEvaluation.verdict} />
                      {(activeEvaluation.sandbox_evidence?.executed === false || activeEvaluation.sandbox_evidence?.runner_mode === "disabled") && (
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
                        Sandbox execution failed closed. Milestone is marked as <strong>Needs Manual Review</strong>. Code was not executed on the host system.
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

                  <div className="flex items-center gap-6 p-5 rounded-card bg-surface-subtle border border-border-subtle">
                    <ScoreRing score={activeEvaluation.overall_score} size={88} />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-content-primary">
                          Judge Verdict Feedback:
                        </span>
                        <span className="font-serif font-bold text-sm text-primary">
                          {activeEvaluation.overall_score >= 0.85
                            ? `Full Release ($${Number(activeMilestone.amount || 0).toFixed(2)})`
                            : activeEvaluation.overall_score >= 0.5
                            ? `Partial Release ($${(Number(activeMilestone.amount || 0) * activeEvaluation.overall_score).toFixed(2)})`
                            : "No Payout Released"}
                        </span>
                      </div>
                      <p className="text-xs text-content-secondary leading-relaxed italic">
                        &quot;{activeEvaluation.feedback_for_freelancer}&quot;
                      </p>
                    </div>
                  </div>

                  {/* Per-Criterion Results */}
                  {activeEvaluation.per_criterion_results && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-content-secondary block">
                        Per-Criterion Performance Breakdown
                      </span>
                      {activeEvaluation.per_criterion_results.map((cr, idx) => (
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

                  {/* Collapsible Sandbox Terminal Output or Disabled Notice */}
                  {activeEvaluation.sandbox_evidence?.stdout ? (
                    <CodeBlock
                      title={`Automated Sandbox Test Execution Log (${activeEvaluation.sandbox_evidence.provider || activeEvaluation.sandbox_evidence.runner_mode || "isolated"})`}
                      code={activeEvaluation.sandbox_evidence.stdout}
                    />
                  ) : (activeEvaluation.sandbox_evidence?.executed === false || activeEvaluation.sandbox_evidence?.runner_mode === "disabled") ? (
                    <div className="p-3.5 rounded-card bg-cream-100 border border-border-subtle text-xs text-content-secondary flex items-center justify-between">
                      <span className="font-mono font-medium">Tests were not executed</span>
                      <span className="text-[11px] text-content-muted">Static AI criteria review only (Sandbox provider disabled)</span>
                    </div>
                  ) : null}

                  {/* Actions: Resubmit or Dispute (Only when milestone is NOT already verified & paid) */}
                  {activeEvaluation.verdict !== "pass" && (
                    isMilestonePaid ? (
                      <div className="pt-3 border-t border-border-subtle flex items-center justify-between text-xs bg-emerald-50/70 p-2.5 rounded border border-emerald-200 text-emerald-900">
                        <span className="flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>This milestone was revised in a later submission and is now 100% verified & paid in full.</span>
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-emerald-800">Closed</span>
                      </div>
                    ) : (
                      <div className="pt-2 flex items-center justify-between border-t border-border-subtle">
                        <button
                          type="button"
                          onClick={() => handleOpenDispute(activeMilestone)}
                          className="text-xs text-danger hover:underline font-semibold"
                        >
                          Dispute this Verdict
                        </button>

                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<RotateCcw className="w-3.5 h-3.5" />}
                          onClick={() =>
                            handleFixAndResubmit(
                              activeSubmission?.content_text,
                              activeSubmission?.submission_type
                            )
                          }
                        >
                          Fix & Resubmit
                        </Button>
                      </div>
                    )
                  )}
                </Card>
              </div>
            )}

              {/* Deliverable Submission Form OR Milestone Passed Card */}
              <div ref={submissionFormRef}>
                {(activeMilestone.status === "passed" || activeMilestone.status === "paid") ? (
                  <Card
                    padding="lg"
                    className="bg-emerald-50/90 border-emerald-300 shadow-soft text-center space-y-4"
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-serif font-bold text-emerald-950">
                        Milestone {activeMilestoneIndex + 1} Verified & Paid in Full!
                      </h3>
                      <p className="text-xs text-emerald-800 max-w-lg mx-auto leading-relaxed">
                        The AI Judge evaluated this deliverable with a <strong>100% score</strong>. The full escrow payout of{" "}
                        <strong className="text-emerald-900 font-mono font-bold">
                          ${Number(activeMilestone.paid_amount || activeMilestone.amount).toFixed(2)} USD
                        </strong>{" "}
                        has been successfully captured and released from PayPal escrow to your account.
                      </p>
                    </div>

                    {nextMilestone ? (
                      <div className="pt-2">
                        <Button
                          size="md"
                          onClick={() => {
                            setSelectedMilestoneId(nextMilestone.id);
                            setSelectedSubmissionId(null);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          icon={<ArrowRight className="w-4 h-4" />}
                        >
                          Proceed to Milestone {activeMilestoneIndex + 2}: {nextMilestone.title} (${Number(nextMilestone.amount || 0).toFixed(2)})
                        </Button>
                      </div>
                    ) : (
                      <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                        <Link href="/freelancer/earnings">
                          <Button size="md" variant="primary" icon={<DollarSign className="w-4 h-4" />}>
                            View Earnings & PayPal Ledger
                          </Button>
                        </Link>
                        <Link href="/freelancer/work">
                          <Button size="md" variant="outline">
                            View All Contracts
                          </Button>
                        </Link>
                      </div>
                    )}
                  </Card>
                ) : (
                  <Card
                    padding="md"
                    className={`space-y-4 transition-all ${
                      isResubmitting ? "ring-2 ring-accent border-accent/40 bg-accent/5" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-serif font-bold text-content-primary">
                          {isResubmitting
                            ? `Fix & Resubmit Revision #${sortedSubmissions.length + 1}`
                            : sortedSubmissions.length > 0
                            ? `Submit Revision #${sortedSubmissions.length + 1} to AI Judge`
                            : "Submit Deliverable to AI Judge"}
                        </h3>
                        {isResubmitting && (
                          <p className="text-xs text-accent font-medium mt-0.5">
                            Address the AI Judge&apos;s feedback above and submit your updated deliverables.
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        {(["code", "document", "image", "url"] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setSubmissionType(t)}
                            className={`px-2.5 py-1 rounded text-xs capitalize transition-colors ${
                              submissionType === t
                                ? "bg-primary text-primary-foreground font-semibold"
                                : "bg-surface-subtle text-content-secondary hover:text-content-primary"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {submitError && (
                      <div className="p-3 text-xs rounded-btn bg-danger-bg border border-danger-border text-danger">
                        {submitError}
                      </div>
                    )}

                    <form onSubmit={handleSubmitDeliverable} className="space-y-4">
                      <FileDropzone
                        onFileSelect={(file) => setSubmissionFile(file)}
                        selectedFile={submissionFile}
                      />

                      <Textarea
                        ref={textareaRef}
                        label="Deliverable Code / Text / URL"
                        placeholder="Paste code implementation, repository URL, or summary of deliverables here..."
                        helperText="Submissions are isolated and tested automatically in a Docker sandbox by the AI Judge."
                        rows={6}
                        value={submissionText}
                        onChange={(e) => setSubmissionText(e.target.value)}
                      />

                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-xs text-content-muted">
                          {submitting ? "Running sandbox test harness..." : "Judged against criteria"}
                        </span>
                        <Button
                          type="submit"
                          size="md"
                          loading={submitting}
                          icon={<Upload className="w-4 h-4" />}
                        >
                          {submitting
                            ? "Testing Deliverables..."
                            : sortedSubmissions.length > 0
                            ? `Submit Revision #${sortedSubmissions.length + 1}`
                            : "Submit for Verification"}
                        </Button>
                      </div>
                    </form>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dispute Modal Dialog */}
      <Modal
        isOpen={disputeModalOpen}
        onClose={() => setDisputeModalOpen(false)}
        title="File Verdict Dispute"
        description="Submit your factual defense to the Dispute Agent for impartial binding arbitration."
      >
        <form onSubmit={handleSubmitDispute} className="space-y-4">
          <div className="text-xs bg-cream-100 p-3 rounded-btn border border-border-subtle space-y-1">
            <span className="font-semibold text-content-primary block">
              Milestone: {disputeMilestone?.title}
            </span>
            <span className="text-content-secondary block font-serif">
              Disputed Escrow Value: ${Number(disputeMilestone?.amount || 0).toFixed(2)} USD
            </span>
          </div>

          <Textarea
            label="Defense / Reason for Dispute"
            placeholder="Explain why your submission satisfies the acceptance criteria, or clarify any sandbox environmental mismatches..."
            rows={4}
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            helperText="The Dispute Agent will examine your statement alongside test execution logs."
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
              Submit to Dispute Agent
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

