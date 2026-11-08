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
import { getJob, approveContract, fileDispute, Job, Milestone } from "@/lib/api";

export default function ClientContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);

  // Approval state
  const [approving, setApproving] = useState(false);

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
        return "AI Agents are currently negotiating scope and price in alternating rounds. Review the dialogue transcript.";
      case "awaiting_approval":
        return job.client_approved
          ? "You have approved the contract. Waiting for the freelancer to review and confirm."
          : "Both agents reached agreement. Review the negotiated milestones below and click Approve.";
      case "approved":
        return "Contract approved by both parties. Authorize payment with PayPal Orders v2 to hold funds in escrow.";
      case "funded":
      case "in_progress":
        return "Funds are securely held by PayPal. The freelancer is actively working on deliverables.";
      case "completed":
        return "All milestones have been verified by AI Judge and captured via PayPal. Contract complete.";
      case "disputed":
        return "A milestone verdict is under arbitration by the AI Dispute Agent. Review the case file in Disputes.";
      default:
        return "Review contract terms and milestone acceptance criteria.";
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={job.title}
        description={job.description}
        backHref="/client"
        backLabel="Back to Client Dashboard"
        badge={<StatusChip status={job.status} />}
        action={
          <div className="flex items-center gap-3">
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
                  Fund PayPal Escrow (${(job.contract?.total_amount || job.max_budget).toFixed(2)})
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {/* Helper Card: What Happens Next */}
      <NextStepCard stepText={nextStepExplanation()} />

      {/* Contract Summary Bar */}
      <Card padding="md" className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-content-muted uppercase tracking-wider text-[11px] font-semibold block">
              Total Contract Value
            </span>
            <span className="text-xl font-bold font-serif text-content-primary">
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
              PayPal Escrow State
            </span>
            <span className="text-sm font-semibold text-primary mt-1 block">
              {job.paypal_authorization_id ? "Authorized (Held)" : "Not Yet Funded"}
            </span>
          </div>

          <div>
            <span className="text-content-muted uppercase tracking-wider text-[11px] font-semibold block">
              Approval Status
            </span>
            <span className="text-xs font-medium text-content-secondary mt-1 block">
              {job.client_approved ? "✓ You approved" : "Pending your approval"}
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

      {/* Milestones Stepper & Deliverable Inspection */}
      {milestones.length === 0 ? (
        <Card padding="lg" className="text-center py-12 space-y-3">
          <p className="text-sm text-content-secondary">
            Milestones are currently being negotiated by the agents.
          </p>
          <Link href={`/client/jobs/${job.id}/negotiate`}>
            <Button size="sm" variant="outline">
              Open Live Negotiation Dialogue →
            </Button>
          </Link>
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
                      <StatusChip status={m.status} className="scale-90" />
                    </div>

                    <h4 className="font-serif font-bold text-sm text-content-primary mt-1">
                      {m.title}
                    </h4>

                    <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-border-subtle">
                      <span className="font-serif font-bold text-content-primary">
                        ${m.amount.toFixed(2)}
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
                      ${activeMilestone.amount.toFixed(2)}
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
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-content-secondary">
                        AI Judge Verdict & Evidence
                      </h4>
                      <StatusChip status={latestEvaluation.verdict} />
                    </div>

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

                    {/* Sandbox Terminal Logs */}
                    {latestEvaluation.sandbox_evidence?.stdout && (
                      <CodeBlock
                        title="Sandbox Docker Test Execution Logs"
                        code={latestEvaluation.sandbox_evidence.stdout}
                      />
                    )}

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
              Disputed Amount: ${disputeMilestone?.amount.toFixed(2)} USD
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
    </div>
  );
}

