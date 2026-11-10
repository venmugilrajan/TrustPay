"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Sparkles, CheckCircle2, ArrowRight, RotateCcw, Shield, XCircle, AlertCircle, Users } from "lucide-react";
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
  const searchParams = useSearchParams();
  const jobId = params?.id as string;
  const initialAppId = searchParams?.get("app_id");

  const [job, setJob] = useState<Job | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(initialAppId || null);
  const [loading, setLoading] = useState(true);
  const [negotiating, setNegotiating] = useState(false);
  const [approving, setApproving] = useState(false);

  const loadJobData = async () => {
    try {
      const data = await getJob(jobId);
      setJob(data);
      if (!selectedAppId && data.applications && data.applications.length > 0) {
        setSelectedAppId(data.applications[0].id);
      }
    } catch (err) {
      console.warn("Failed to load negotiation:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobData();
  }, [jobId]);

  useEffect(() => {
    if (initialAppId) {
      setSelectedAppId(initialAppId);
    }
  }, [initialAppId]);

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

  const candidateApps = job.applications || [];
  const selectedApp =
    candidateApps.find((a) => a.id === selectedAppId) ||
    candidateApps[0] ||
    null;

  const turns =
    (selectedApp && (selectedApp as any).negotiation_turns && (selectedApp as any).negotiation_turns.length > 0)
      ? (selectedApp as any).negotiation_turns
      : job.negotiation_turns || [];

  // Only consider contract valid for THIS candidate if contract application_id matches selectedApp.id
  const contract =
    selectedApp?.contract ||
    (job.contract && selectedApp && job.contract.application_id === selectedApp.id
      ? job.contract
      : null);
  const candidateName = selectedApp?.freelancer_name || "Freelancer";

  const isCandidateNoDeal =
    selectedApp?.status === "no_deal" ||
    turns.some(
      (t: any) =>
        t.proposal_summary?.toLowerCase().includes("no deal") ||
        t.message?.toLowerCase().includes("without a deal") ||
        t.message?.toLowerCase().includes("without agreement")
    );

  const isAgreed =
    !isCandidateNoDeal &&
    Boolean(
      contract ||
        (turns.length > 0 && turns.some((t: any) => t.agreed)) ||
        selectedApp?.status === "agreement_reached" ||
        selectedApp?.status === "approved" ||
        selectedApp?.status === "funded"
    );

  const isNegotiating =
    !isCandidateNoDeal &&
    !isAgreed &&
    (job.status === "negotiating" || selectedApp?.status === "negotiating");

  const effectiveStatus = isCandidateNoDeal
    ? "no_deal"
    : isAgreed
    ? "negotiated"
    : isNegotiating
    ? "negotiating"
    : (selectedApp?.status || job.status);

  return (
    <div className="space-y-8">
      <PageHeader
        title="AI Agent Negotiation Dialogue"
        description="Your Client Agent and the Freelancer Agent negotiate scope, price, and acceptance criteria in alternating rounds."
        backHref={`/client/jobs/${job.id}`}
        backLabel="Back to Contract Overview"
        badge={<StatusChip status={effectiveStatus} role="client" />}
        action={
          isNegotiating ? (
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

      {/* Candidate Selector Tabs when multiple applicants exist */}
      {candidateApps.length > 1 && (
        <Card padding="sm" className="bg-surface border-border-subtle">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-content-secondary uppercase tracking-wider flex items-center gap-1.5 mr-2">
              <Users className="w-3.5 h-3.5 text-primary" />
              Candidate Threads:
            </span>
            {candidateApps.map((app) => {
              const isSelected = selectedApp?.id === app.id;
              return (
                <button
                  key={app.id}
                  onClick={() => setSelectedAppId(app.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 border ${
                    isSelected
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-surface-subtle text-content-secondary border-border hover:bg-surface"
                  }`}
                >
                  <span>{app.freelancer_name}</span>
                  <StatusChip
                    status={app.status}
                    role="client"
                    className="scale-90 origin-left"
                  />
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <NextStepCard
        stepText={
          isCandidateNoDeal
            ? `Proposal Ended: Budget Constraints Did Not Overlap. ${candidateName}'s quote exceeded your allocated budget threshold ($${Number(job.max_budget || 120).toFixed(2)} USD). Your project listing remains open for other proposals.`
            : isAgreed
            ? `Consensus reached with ${candidateName}! Review the agreed draft on the right and accept to proceed to escrow safe-hold.`
            : `Agents are actively proposing terms for ${candidateName}. Click Auto-Run to complete the minimum 3 rounds of consensus.`
        }
      />

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Cols: Chat Transcript */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <span className="text-xs font-semibold uppercase tracking-wider text-content-secondary">
              Negotiation Transcript ({turns.length} turns)
              {candidateApps.length > 1 && ` · ${candidateName}`}
            </span>
            <span className="text-xs text-content-muted">
              {isCandidateNoDeal ? "Closed: No Deal" : "Min. 3 rounds required"}
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
              {turns.map((turn: any) => (
                <ChatBubble
                  key={turn.id}
                  sender={turn.agent_role}
                  agentName={
                    turn.agent_role === "client"
                      ? "Client Agent (Maya Patel)"
                      : `Freelancer Agent (${candidateName})`
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
              {contract && <StatusChip status="negotiated" role="client" />}
            </div>

            {contract ? (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-btn bg-surface-subtle border border-border-subtle">
                  <span className="text-content-muted uppercase tracking-wider text-[10px] font-semibold block">
                    Agreed Total Amount
                  </span>
                  <div className="text-2xl font-serif font-bold text-primary mt-0.5">
                    ${Number(contract?.total_amount || 0).toFixed(2)} {contract.currency}
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
                          ${Number(m.amount || 0).toFixed(2)}
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

                  {isNegotiating && (
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
            ) : isCandidateNoDeal ? (
              <div className="text-center py-8 space-y-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-600">
                  <XCircle className="w-5 h-5 text-amber-500" />
                </div>
                <h4 className="font-serif font-bold text-sm text-content-primary">
                  No Contract Formed
                </h4>
                <p className="text-xs text-content-secondary max-w-xs mx-auto leading-relaxed">
                  The negotiation with {candidateName} concluded without consensus due to non-overlapping budget requirements.
                </p>
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

