"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Sparkles, CheckCircle2, ArrowRight, RotateCcw, Shield } from "lucide-react";
import {
  PageHeader,
  Card,
  ChatBubble,
  Button,
  StatusChip,
  Skeleton,
  NextStepCard,
} from "@/components/ui";
import { getJob, stepNegotiation, approveContract, Job } from "@/lib/api";

export default function ClientNegotiatePage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [negotiating, setNegotiating] = useState(false);
  const [approving, setApproving] = useState(false);

  const loadJobData = async () => {
    try {
      const data = await getJob(jobId);
      setJob(data);
    } catch (err) {
      console.warn("Failed to load negotiation:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobData();
  }, [jobId]);

  const handleStep = async (runAll: boolean) => {
    setNegotiating(true);
    try {
      await stepNegotiation(jobId, runAll);
      await loadJobData();
    } catch (err: any) {
      alert(`Negotiation step failed: ${err.message}`);
    } finally {
      setNegotiating(false);
    }
  };

  const handleAcceptContract = async () => {
    setApproving(true);
    try {
      await approveContract(jobId, "client");
      await loadJobData();
      router.push(`/client/jobs/${jobId}`);
    } catch (err: any) {
      alert(`Approval failed: ${err.message}`);
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton height={40} className="w-1/3" />
        <Skeleton height={200} className="w-full" />
      </div>
    );
  }

  if (!job) return null;

  const turns = job.negotiation_turns || [];
  const contract = job.contract;

  return (
    <div className="space-y-8">
      <PageHeader
        title="AI Agent Negotiation Dialogue"
        description="Your Client Agent and the Freelancer Agent negotiate scope, price, and acceptance criteria in alternating rounds."
        backHref={`/client/jobs/${job.id}`}
        backLabel="Back to Contract Overview"
        badge={<StatusChip status={job.status} />}
        action={
          job.status === "negotiating" ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStep(false)}
                disabled={negotiating}
              >
                Step 1 Turn
              </Button>
              <Button
                size="sm"
                onClick={() => handleStep(true)}
                loading={negotiating}
                icon={<Sparkles className="w-4 h-4" />}
              >
                Auto-Run to Agreement
              </Button>
            </div>
          ) : null
        }
      />

      <NextStepCard
        stepText={
          job.status === "negotiating"
            ? "Agents are actively proposing terms. Click Auto-Run to complete the minimum 3 rounds of consensus."
            : "Consensus reached on contract terms! Review the agreed draft on the right and accept to proceed to funding."
        }
      />

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Cols: Chat Transcript */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <span className="text-xs font-semibold uppercase tracking-wider text-content-secondary">
              Negotiation Transcript ({turns.length} turns)
            </span>
            <span className="text-xs text-content-muted">
              Min. 3 rounds required
            </span>
          </div>

          {turns.length === 0 ? (
            <Card padding="lg" className="text-center py-12 space-y-4">
              <Sparkles className="w-8 h-8 text-primary mx-auto animate-pulse" />
              <h3 className="font-serif font-bold text-base text-content-primary">
                Ready to Initiate Negotiation
              </h3>
              <p className="text-xs text-content-secondary max-w-sm mx-auto leading-relaxed">
                Prompt both autonomous agents to begin exchanging proposals for &ldquo;{job.title}&rdquo;.
              </p>
              <Button
                size="md"
                onClick={() => handleStep(true)}
                loading={negotiating}
                icon={<Sparkles className="w-4 h-4" />}
              >
                Start Autonomous Dialogue
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {turns.map((turn) => (
                <ChatBubble
                  key={turn.id}
                  sender={turn.agent_role}
                  agentName={
                    turn.agent_role === "client" ? "Your Agent (Buyer)" : "Freelancer Agent"
                  }
                  roundNumber={turn.round_number}
                  message={turn.message}
                  proposedPrice={turn.proposed_price}
                  priceChangeReason={turn.price_change_reason}
                  agreed={turn.agreed}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right 5 Cols: Sticky Proposed Contract Panel */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <Card padding="md" className="space-y-4 bg-surface shadow-soft border-border-strong">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-base text-content-primary">
                Proposed Contract Draft
              </h3>
              {contract && <StatusChip status="negotiated" />}
            </div>

            {contract ? (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-btn bg-surface-subtle border border-border-subtle">
                  <span className="text-content-muted uppercase tracking-wider text-[10px] font-semibold block">
                    Agreed Total Amount
                  </span>
                  <div className="text-2xl font-serif font-bold text-primary mt-0.5">
                    ${contract.total_amount.toFixed(2)} {contract.currency}
                  </div>
                  <span className="text-content-muted text-[11px] font-mono mt-1 block">
                    Deadline: {contract.deadline}
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="font-semibold text-content-secondary uppercase tracking-wider text-[11px] block">
                    Milestone Breakdown ({contract.milestones.length})
                  </span>
                  {contract.milestones.map((m, idx) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-btn bg-cream-100 border border-border-subtle space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-content-primary">
                          #{idx + 1} {m.title}
                        </span>
                        <span className="font-serif font-bold text-content-primary">
                          ${m.amount.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[11px] text-content-secondary line-clamp-2">
                        {m.description}
                      </p>
                      <div className="pt-1 text-[10px] text-content-muted">
                        {m.acceptance_criteria.length} criteria defined
                      </div>
                    </div>
                  ))}
                </div>

                {/* Primary Action Buttons */}
                <div className="pt-3 border-t border-border-subtle space-y-2">
                  <Button
                    size="md"
                    className="w-full"
                    onClick={handleAcceptContract}
                    loading={approving}
                    icon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Accept Contract as Client
                  </Button>

                  {job.status === "negotiating" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleStep(false)}
                      disabled={negotiating}
                      icon={<RotateCcw className="w-3.5 h-3.5" />}
                    >
                      Ask Agents to Renegotiate Round
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-content-muted">
                Contract draft will populate as agents agree on milestones and pricing.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
