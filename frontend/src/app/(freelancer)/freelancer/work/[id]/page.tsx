"use client";

import React, { useEffect, useState } from "react";
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

  // Approval state
  const [approving, setApproving] = useState(false);

  // Submission form state
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionType, setSubmissionType] = useState<"code" | "document" | "image" | "url">("code");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
      await loadJobData();
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit deliverable");
    } finally {
      setSubmitting(false);
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

  const latestSubmission =
    activeMilestone?.submissions && activeMilestone.submissions.length > 0
      ? activeMilestone.submissions[activeMilestone.submissions.length - 1]
      : null;

  const latestEvaluation =
    latestSubmission?.evaluations && latestSubmission.evaluations.length > 0
      ? latestSubmission.evaluations[latestSubmission.evaluations.length - 1]
      : null;

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
              <Card padding="md" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-serif font-bold text-content-primary">
                    Submit Deliverable to AI Judge
                  </h3>
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
                      {submitting ? "Testing Deliverables..." : "Submit for Verification"}
                    </Button>
                  </div>
                </form>
              </Card>

              {/* AI Judge Verdict View */}
              {latestEvaluation && (
                <Card padding="lg" className="space-y-6 bg-surface shadow-soft border-border-strong">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-serif font-bold text-content-primary">
                      AI Judge Verdict & Verification
                    </h3>
                    <StatusChip status={latestEvaluation.verdict} />
                  </div>

                  <div className="flex items-center gap-6 p-5 rounded-card bg-surface-subtle border border-border-subtle">
                    <ScoreRing score={latestEvaluation.overall_score} size={88} />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-content-primary">
                          Judge Verdict Feedback:
                        </span>
                        <span className="font-serif font-bold text-sm text-primary">
                          {latestEvaluation.overall_score >= 0.85
                            ? `Full Release ($${activeMilestone.amount.toFixed(2)})`
                            : latestEvaluation.overall_score >= 0.5
                            ? `Partial Release ($${(activeMilestone.amount * latestEvaluation.overall_score).toFixed(2)})`
                            : "No Payout Released"}
                        </span>
                      </div>
                      <p className="text-xs text-content-secondary leading-relaxed italic">
                        &quot;{latestEvaluation.feedback_for_freelancer}&quot;
                      </p>
                    </div>
                  </div>

                  {/* Per-Criterion Results */}
                  {latestEvaluation.per_criterion_results && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-content-secondary block">
                        Per-Criterion Performance Breakdown
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

                  {/* Collapsible Sandbox Terminal Output */}
                  {latestEvaluation.sandbox_evidence?.stdout && (
                    <CodeBlock
                      title="Automated Sandbox Test Execution Log"
                      code={latestEvaluation.sandbox_evidence.stdout}
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

                    {latestEvaluation.verdict !== "pass" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          window.scrollTo({ top: 300, behavior: "smooth" });
                        }}
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
