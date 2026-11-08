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
    if (!selectedMilestoneId) return;

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

      await submitMilestoneWork(jobId, selectedMilestoneId, formData);
      setSubmissionText("");
      setSubmissionFile(null);
      setIsResubmitting(false);
      setSelectedSubmissionId(null); // automatically displays newest version!
      await loadJobData();
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

      {/* Contract Financial Snapshot */}
      <Card padding="md" className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-content-muted uppercase tracking-wider text-[11px] font-semibold block">
              Total Contract Escrow
            </span>
            <span className="text-xl font-bold font-serif text-primary">
              ${(job.contract?.total_amount || job.max_budget).toFixed(2)} USD
            </span>
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
            <span className="text-xs font-semibold text-success mt-1 block flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              <span>{job.paypal_authorization_id ? "Escrow Locked" : "Awaiting Authorization"}</span>
            </span>
          </div>

          <div>
            <span className="text-content-muted uppercase tracking-wider text-[11px] font-semibold block">
              My Confirmation
            </span>
            <span className="text-xs font-medium text-content-secondary mt-1 block">
              {job.freelancer_approved ? "✓ You confirmed" : "Pending your confirmation"}
            </span>
          </div>
        </div>

        {/* Freelancer Confirmation Action Banner */}
        {job.status === "awaiting_approval" && !job.freelancer_approved && (
          <div className="pt-4 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface-subtle p-4 rounded-btn border border-border-strong">
            <div>
              <p className="text-xs font-semibold text-content-primary">
                Contract Terms Agreed by Agents
              </p>
              <p className="text-xs text-content-secondary mt-0.5">
                Review the milestone breakdown and click Confirm Contract to finalize terms.
              </p>
            </div>
            <Button size="sm" onClick={handleFreelancerApprove} loading={approving}>
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>Confirm Contract as Freelancer</span>
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
        <Card padding="lg" className="text-center py-12 space-y-3">
          <p className="text-sm text-content-secondary">
            Milestones are currently being negotiated.
          </p>
          <Link href={`/freelancer/work/${job.id}/negotiate`}>
            <Button size="sm" variant="outline">
              Open Negotiation Dialogue →
            </Button>
          </Link>
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
                      <StatusChip status={m.status} className="scale-90" />
                    </div>

                    <h4 className="font-serif font-bold text-sm text-content-primary mt-1">
                      {m.title}
                    </h4>

                    <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-border-subtle">
                      <span className="font-serif font-bold text-primary">
                        ${m.amount.toFixed(2)} USD
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
                  <div className="text-right">
                    <span className="text-xs text-content-muted block">Payout</span>
                    <span className="text-2xl font-serif font-bold text-primary">
                      ${activeMilestone.amount.toFixed(2)}
                    </span>
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

              {/* Deliverable Submission Form */}
              <div ref={submissionFormRef}>
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
                          Address the AI Judge&apos;s feedback below and submit your updated deliverables.
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
              </div>

              {/* AI Judge Verdict View */}
              {activeEvaluation && (
                <Card padding="lg" className="space-y-6 bg-surface shadow-soft border-border-strong">
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
                    <StatusChip status={activeEvaluation.verdict} />
                  </div>

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
                            ? `Full Release ($${activeMilestone.amount.toFixed(2)})`
                            : activeEvaluation.overall_score >= 0.5
                            ? `Partial Release ($${(activeMilestone.amount * activeEvaluation.overall_score).toFixed(2)})`
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

                  {/* Collapsible Sandbox Terminal Output */}
                  {activeEvaluation.sandbox_evidence?.stdout && (
                    <CodeBlock
                      title="Automated Sandbox Test Execution Log"
                      code={activeEvaluation.sandbox_evidence.stdout}
                    />
                  )}

                  {/* Actions: Resubmit or Dispute */}
                  <div className="pt-2 flex items-center justify-between border-t border-border-subtle">
                    <button
                      type="button"
                      onClick={() => handleOpenDispute(activeMilestone)}
                      className="text-xs text-danger hover:underline font-semibold"
                    >
                      Dispute this Verdict
                    </button>

                    {activeEvaluation.verdict !== "pass" && (
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
                    )}
                  </div>
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
        title="File Verdict Dispute"
        description="Submit your factual defense to the Dispute Agent for impartial binding arbitration."
      >
        <form onSubmit={handleSubmitDispute} className="space-y-4">
          <div className="text-xs bg-cream-100 p-3 rounded-btn border border-border-subtle space-y-1">
            <span className="font-semibold text-content-primary block">
              Milestone: {disputeMilestone?.title}
            </span>
            <span className="text-content-secondary block font-serif">
              Disputed Escrow Value: ${disputeMilestone?.amount.toFixed(2)} USD
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

