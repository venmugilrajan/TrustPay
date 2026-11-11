"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Sparkles, CheckCircle2, ArrowRight, RotateCcw, XCircle, AlertCircle, Clock } from "lucide-react";
import {
  PageHeader,
  Card,
  ChatBubble,
  Button,
  StatusChip,
  Skeleton,
  NextStepCard,
} from "@/components/ui";
import {
  getJob,
  stepNegotiation,
  approveContract,
  decideApplication,
  getStoredUser,
  ensureDemoUser,
  Job,
} from "@/lib/api";

export default function FreelancerNegotiatePage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [negotiating, setNegotiating] = useState(false);
  const [approving, setApproving] = useState(false);

  const loadJobData = async () => {
    try {
      const stored = getStoredUser("freelancer");
      const userId = stored?.id || "freelancer_arjun";
      await ensureDemoUser(userId, "freelancer").catch(() => {});

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
      if (myApp?.id) {
        await decideApplication(myApp.id, "accept", { role: "freelancer" });
      } else {
        await approveContract(jobId, "freelancer");
      }
      await loadJobData();
      router.push(`/freelancer/work/${jobId}`);
    } catch (err: any) {
      alert(`Confirmation failed: ${err.message}`);
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

  const stored = getStoredUser("freelancer");
  const currentUserId = stored?.id || "freelancer_arjun";

  // STRICT APPLICATION RESOLUTION: Match THIS signed-in freelancer's application only
  const myApp =
    (job as any).my_application ||
    (job.applications || []).find((a: any) => a.freelancer_id === currentUserId) ||
    null;

  const freelancerName = myApp?.freelancer_name || stored?.name || "Freelancer";

  // Use this application's specific turns if present, otherwise job's turns
  const turns =
    (myApp && (myApp as any).negotiation_turns && (myApp as any).negotiation_turns.length > 0)
      ? (myApp as any).negotiation_turns
      : (job.negotiation_turns || []);

  // ONLY consider contract valid for THIS freelancer if the contract's application_id matches myApp.id
  const contract =
    myApp?.contract ||
    (job.contract && myApp && job.contract.application_id === myApp.id
      ? job.contract
      : null);

  const isThanksgiving = myApp?.status === "thanksgiving";
  const isClientAccepted = Boolean(
    myApp?.client_accepted || myApp?.status === "awaiting_freelancer_acceptance"
  );
  const isFreelancerAccepted = Boolean(
    myApp?.freelancer_accepted || myApp?.status === "approved" || myApp?.status === "funded"
  );

  const isNoDeal =
    myApp?.status === "no_deal" ||
    turns.some(
      (t) =>
        t.proposal_summary?.toLowerCase().includes("no deal") ||
        t.message?.toLowerCase().includes("without a deal") ||
        t.message?.toLowerCase().includes("without agreement")
    );

  const isAgreed =
    !isNoDeal &&
    !isThanksgiving &&
    Boolean(
      contract ||
        (turns.length > 0 && turns.some((t) => t.agreed)) ||
        myApp?.status === "agreement_reached" ||
        myApp?.status === "approved" ||
        myApp?.status === "funded"
    );

  const isNegotiating =
    !isNoDeal &&
    !isAgreed &&
    !isThanksgiving &&
    (turns.length > 0 || job.status === "negotiating" || myApp?.status === "negotiating");

  const effectiveStatus = isThanksgiving
    ? "thanksgiving"
    : isClientAccepted && !isFreelancerAccepted
    ? "awaiting_freelancer_acceptance"
    : isNoDeal
    ? "no_deal"
    : isAgreed
    ? contract
      ? "negotiated"
      : "agreement_reached"
    : isNegotiating
    ? "negotiating"
    : (myApp?.status || job.status);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Negotiation Dialogue"
        description="Your Freelancer Agent advocates for fair pricing and realistic timelines against the buyer agent."
        backHref={`/freelancer/work/${job.id}`}
        backLabel="Back to Work Overview"
        badge={<StatusChip status={effectiveStatus} role="freelancer" />}
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

      {/* Thanksgiving Notice for Unselected Candidates */}
      {isThanksgiving && (
        <div className="p-5 rounded-2xl bg-surface-subtle border border-border space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-surface text-content-muted flex items-center justify-center shrink-0 border border-border mt-0.5">
                <CheckCircle2 className="w-5 h-5 text-content-muted" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-content-secondary">
                    Proposal Archived · Thank You
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface text-content-muted border border-border">
                    Other Candidate Selected
                  </span>
                </div>
                <p className="text-xs text-content-secondary leading-relaxed max-w-2xl">
                  The client has selected another candidate's quote for this project. Thank you for your time and competitive proposal! Your profile remains active and highly rated for open marketplace projects.
                </p>
              </div>
            </div>
            <Link href="/freelancer/opportunities">
              <Button size="sm" variant="outline" className="shrink-0">
                Browse Open Opportunities
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Client Accepted Notification Banner */}
      {isClientAccepted && !isFreelancerAccepted && (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-subtle">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-200">
                  Client Accepted Your Proposal!
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30">
                  Confirmation Needed
                </span>
              </div>
              <p className="text-xs text-content-secondary leading-relaxed max-w-2xl">
                The client approved your quote of <strong className="text-content-primary font-serif font-bold">${Number(contract?.total_amount || 0).toFixed(2)} USD</strong> for <strong>&quot;{job.title}&quot;</strong> across {contract?.milestones?.length || 3} milestones. Do you confirm and accept to work on this project?
              </p>
            </div>
          </div>
          <Button
            size="md"
            variant="primary"
            icon={<CheckCircle2 className="w-4 h-4 text-white" />}
            onClick={handleAcceptContract}
            loading={approving}
            className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            Confirm & Accept Work
          </Button>
        </div>
      )}

      <NextStepCard
        stepText={
          isThanksgiving
            ? "Thank You Notice: The client selected another candidate's quote for this project. Your profile remains active for new client listings."
            : isClientAccepted && !isFreelancerAccepted
            ? `The client selected your quote for "${job.title}"! Please review the terms on the right and click "Confirm & Accept Work" to begin.`
            : isNoDeal
            ? "Proposal Ended: Budget Constraints Did Not Overlap. The client's budget was below your minimum acceptable price."
            : isAgreed
            ? "Agreed Terms Ready: Waiting for the client to review quotes and select a candidate."
            : turns.length === 0
            ? "Click below to begin autonomous multi-round negotiation between your Freelancer Agent and the Client Agent."
            : "Your agent is actively negotiating terms. Minimum 3 rounds of proposals before final contract consensus."
        }
      />

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Cols: Chat Transcript */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <span className="text-xs font-semibold uppercase tracking-wider text-content-secondary">
              Proposal Exchange ({turns.length} turns)
            </span>
            <span className="text-xs text-content-muted">
              {isNoDeal ? "Closed: No Deal" : "Consensus requires min. 3 rounds"}
            </span>
          </div>

          {turns.length === 0 ? (
            <Card padding="lg" className="text-center py-12 space-y-4">
              <Sparkles className="w-8 h-8 text-primary mx-auto animate-pulse" />
              <h3 className="font-serif font-bold text-base text-content-primary">
                Awaiting Agent Turns
              </h3>
              <p className="text-xs text-content-secondary max-w-sm mx-auto leading-relaxed">
                Click below to start autonomous negotiation between your Freelancer Agent and the Client Agent.
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
                    turn.agent_role === "freelancer"
                      ? `Freelancer Agent (${freelancerName})`
                      : "Client Agent (Maya Patel)"
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
                Agreed Contract Terms
              </h3>
              {contract && <StatusChip status="negotiated" role="freelancer" />}
            </div>

            {contract ? (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-btn bg-surface-subtle border border-border-subtle">
                  <span className="text-content-muted uppercase tracking-wider text-[10px] font-semibold block">
                    Agreed Escrow Value
                  </span>
                  <div className="text-2xl font-serif font-bold text-primary mt-0.5">
                    ${Number(contract?.total_amount || 0).toFixed(2)} {contract.currency}
                  </div>
                  <span className="text-content-muted text-[11px] font-mono mt-1 block">
                    Final Deadline: {contract.deadline}
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="font-semibold text-content-secondary uppercase tracking-wider text-[11px] block">
                    Milestones ({contract.milestones.length})
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
                  {isFreelancerAccepted && isClientAccepted ? (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-btn text-center text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Contract Approved by Both! Waiting for Client Escrow Funding</span>
                    </div>
                  ) : isClientAccepted && !isFreelancerAccepted ? (
                    <Button
                      size="md"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md"
                      onClick={handleAcceptContract}
                      loading={approving}
                      icon={<CheckCircle2 className="w-4 h-4 text-white" />}
                    >
                      Confirm & Accept Work with Client
                    </Button>
                  ) : isFreelancerAccepted && !isClientAccepted ? (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-btn text-center text-xs font-semibold text-amber-800 dark:text-amber-200 flex items-center justify-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>You Confirmed Terms · Waiting for Client Selection</span>
                    </div>
                  ) : (
                    /* Strict sequential flow: Client must select/approve freelancer's quote first */
                    <div className="p-3 bg-surface-subtle border border-border-subtle rounded-btn text-center space-y-1">
                      <div className="text-xs font-semibold text-content-secondary flex items-center justify-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-accent" />
                        <span>Awaiting Client Selection</span>
                      </div>
                      <p className="text-[11px] text-content-muted leading-relaxed">
                        Terms agreed by AI agents. Once the client approves your proposal, you will receive a notification here to confirm and accept the work.
                      </p>
                    </div>
                  )}

                  {isNegotiating && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleStep(false)}
                      disabled={negotiating}
                      icon={<RotateCcw className="w-3.5 h-3.5" />}
                    >
                      Counter-Offer Next Round
                    </Button>
                  )}
                </div>
              </div>
            ) : isNoDeal ? (
              <div className="text-center py-8 space-y-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-600">
                  <XCircle className="w-5 h-5 text-amber-500" />
                </div>
                <h4 className="font-serif font-bold text-sm text-content-primary">
                  No Contract Formed
                </h4>
                <p className="text-xs text-content-secondary max-w-xs mx-auto leading-relaxed">
                  Because the negotiation ended without consensus, no contract draft was created.
                </p>
                <div className="pt-2">
                  <Link href="/freelancer/opportunities">
                    <Button size="sm" variant="outline" className="w-full">
                      Explore Other Opportunities
                    </Button>
                  </Link>
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

