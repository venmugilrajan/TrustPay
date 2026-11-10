/**
 * Plain-language, role-aware status labels and "What to do now" action texts.
 * 
 * Rules:
 * - Zero jargon: no "escrow", "authorization", "capture", "milestone", "acceptance criteria".
 * - Role-aware: Client and Freelancer see clear, distinct guidance for their perspective.
 * - Zero emojis: Pure clean typography and Lucide icons.
 */

export type UserRole = "client" | "freelancer";

export interface StatusDescriptor {
  label: string;
  badgeStyle: "info" | "warning" | "success" | "neutral" | "danger";
  plainSummary: string;
  iconName: string;
}

export interface WhatToDoNowConfig {
  headline: string;
  explanation: string;
  actionLabel?: string;
  actionHref?: string;
  isUrgent?: boolean;
}

export function getRoleStatusDescriptor(
  status: string,
  role: UserRole
): StatusDescriptor {
  const norm = (status || "").toLowerCase().replace(/[-\s]/g, "_");

  switch (norm) {
    case "negotiating":
    case "in_negotiation":
      return {
        label: role === "client" ? "Autonomous Negotiation Active" : "Terms Under Negotiation",
        badgeStyle: "info",
        plainSummary: role === "client"
          ? "AI agents are negotiating timeline and terms on your behalf."
          : "AI agents are establishing mutually agreed terms.",
        iconName: "MessageSquare",
      };

    case "awaiting_approval":
    case "needs_approval":
      return {
        label: role === "client" ? "Needs Your Decision" : "Agreement Reached · Pending Client",
        badgeStyle: "warning",
        plainSummary: role === "client"
          ? "Freelancer accepted the proposed terms. Review and give final approval."
          : "You agreed on terms. Waiting for client to approve and hold funds.",
        iconName: "Clock",
      };

    case "approved":
      return {
        label: role === "client" ? "Approved · Ready to Hold Funds" : "Approved · Awaiting Safe Hold",
        badgeStyle: "warning",
        plainSummary: role === "client"
          ? "Both parties approved. Safe hold through PayPal is required to start."
          : "Contract approved. Work begins once client funds the safe hold.",
        iconName: "CheckCircle2",
      };

    case "funded":
      return {
        label: role === "client" ? "Money Held Safely · In Progress" : "Money Secured · Work in Progress",
        badgeStyle: "success",
        plainSummary: role === "client"
          ? "Funds are securely locked by PayPal. The freelancer is actively building."
          : "Funds are 100% guaranteed by PayPal. Deliver payment stages to be paid.",
        iconName: "Lock",
      };

    case "in_progress":
      return {
        label: role === "client" ? "Work Underway" : "Active Delivery",
        badgeStyle: "info",
        plainSummary: role === "client"
          ? "Freelancer is actively working against agreed deliverables."
          : "You are actively working on deliverables for this payment stage.",
        iconName: "Play",
      };

    case "submitted":
    case "under_review":
    case "judging":
    case "evaluating":
      return {
        label: role === "client" ? "Work Being Checked by AI" : "Under Automated Verification",
        badgeStyle: "warning",
        plainSummary: role === "client"
          ? "Automated verification is checking code and deliverables in a secure sandbox."
          : "AI Work Checker is evaluating your submission against agreed delivery specs.",
        iconName: "Scale",
      };

    case "verified":
    case "pass":
    case "passed":
      return {
        label: role === "client" ? "Work Passed · Payment Releasing" : "Verified Passed · Payout Queued",
        badgeStyle: "success",
        plainSummary: role === "client"
          ? "100% of delivery criteria passed. Payment is automatically releasing."
          : "100% verification score! PayPal payment release is executing.",
        iconName: "CheckCircle2",
      };

    case "paid":
    case "completed":
      return {
        label: role === "client" ? "Payment Released & Completed" : "Payment Released to You",
        badgeStyle: "success",
        plainSummary: role === "client"
          ? "All stages passed and funds have been released to the freelancer."
          : "Earnings have been transferred directly to your PayPal account.",
        iconName: "CheckCircle2",
      };

    case "disputed":
      return {
        label: role === "client" ? "Under Arbitration" : "In Dispute Review",
        badgeStyle: "danger",
        plainSummary: role === "client"
          ? "An issue was raised. AI Dispute Agent is analyzing test logs and evidence."
          : "Dispute opened. Independent AI arbitration is reviewing submissions.",
        iconName: "AlertTriangle",
      };

    case "refunded":
      return {
        label: role === "client" ? "Funds Returned" : "Refund Issued",
        badgeStyle: "neutral",
        plainSummary: role === "client"
          ? "Unclaimed funds were returned safely to your PayPal account."
          : "Funds were refunded back to client per dispute settlement.",
        iconName: "RotateCcw",
      };

    case "open":
      return {
        label: role === "client" ? "Open for Proposals" : "Open Opportunity",
        badgeStyle: "info",
        plainSummary: role === "client"
          ? "Your job listing is active and accepting freelancer proposals."
          : "Client project is open and accepting applications.",
        iconName: "Clock",
      };

    case "no_deal":
      return {
        label: role === "client" ? "Budget Mismatch" : "No Agreement",
        badgeStyle: "warning",
        plainSummary: role === "client"
          ? "Candidate quote was above your allocated budget."
          : "Client budget was below your minimum rate floor.",
        iconName: "AlertTriangle",
      };

    case "closed":
      return {
        label: role === "client" ? "Job Closed" : "Listing Closed",
        badgeStyle: "neutral",
        plainSummary: role === "client"
          ? "You closed this project listing."
          : "The client closed this project listing.",
        iconName: "XCircle",
      };

    default:
      return {
        label: status.replace(/_/g, " "),
        badgeStyle: "neutral",
        plainSummary: "Status updated.",
        iconName: "Clock",
      };
  }
}

export function getWhatToDoNow(
  status: string,
  role: UserRole,
  context?: {
    jobId?: string;
    jobTitle?: string;
    contractAmount?: number;
    freelancerName?: string;
    clientName?: string;
    currentMilestoneTitle?: string;
    isAllMilestonesPaid?: boolean;
  }
): WhatToDoNowConfig {
  const norm = (status || "").toLowerCase().replace(/[-\s]/g, "_");
  const otherParty = role === "client" ? (context?.freelancerName || "Freelancer") : (context?.clientName || "Client");

  if (context?.isAllMilestonesPaid || norm === "completed" || norm === "paid") {
    return {
      headline: role === "client" ? "All stages paid and delivered" : "All funds released to you",
      explanation: role === "client"
        ? `Contract with ${otherParty} is complete. All deliverables verified and paid.`
        : "All payment stages have been verified and released to your PayPal account.",
      actionLabel: role === "client" ? "View Payments Ledger" : "View Earnings History",
      actionHref: role === "client" ? "/client/payments" : "/freelancer/earnings",
      isUrgent: false,
    };
  }

  switch (norm) {
    case "negotiating":
    case "in_negotiation":
      return {
        headline: role === "client" ? "Autonomous negotiation underway" : "Agents are aligning on terms",
        explanation: role === "client"
          ? `Your AI agent is negotiating terms with ${otherParty}. You will be notified when an agreement is reached.`
          : `Your agent is agreeing on delivery stages with ${otherParty}. Check back shortly.`,
        actionLabel: context?.jobId
          ? (role === "client" ? "View Live Dialogue" : "View Negotiation")
          : undefined,
        actionHref: context?.jobId
          ? (role === "client" ? `/client/jobs/${context.jobId}/negotiate` : `/freelancer/work/${context.jobId}`)
          : undefined,
        isUrgent: false,
      };

    case "awaiting_approval":
    case "needs_approval":
      return {
        headline: role === "client" ? "Review and approve agreed contract" : "Waiting for client's final sign-off",
        explanation: role === "client"
          ? `${otherParty} accepted the proposal. Review the agreed payment stages, then approve to proceed.`
          : `${otherParty} has the finalized contract. Once approved, they will fund the safe hold.`,
        actionLabel: role === "client" && context?.jobId ? "Review Contract" : undefined,
        actionHref: role === "client" && context?.jobId ? `/client/jobs/${context.jobId}` : undefined,
        isUrgent: role === "client",
      };

    case "approved":
      return {
        headline: role === "client" ? "Fund safe hold to begin project" : "Waiting for client to fund safe hold",
        explanation: role === "client"
          ? "Terms are fully agreed. Secure the funds with PayPal authorization so work can start."
          : `${otherParty} is funding the safe hold with PayPal. You will be notified the instant funds are locked.`,
        actionLabel: role === "client" && context?.jobId ? "Fund Safe Hold" : undefined,
        actionHref: role === "client" && context?.jobId ? `/client/jobs/${context.jobId}/fund` : undefined,
        isUrgent: role === "client",
      };

    case "funded":
    case "in_progress":
      return {
        headline: role === "client"
          ? `Work in progress (${context?.currentMilestoneTitle || "Stage 1"})`
          : `Submit work for ${context?.currentMilestoneTitle || "current payment stage"}`,
        explanation: role === "client"
          ? `Funds are securely held. ${otherParty} is building. You will be notified when deliverables are submitted for testing.`
          : "Funds are 100% held in safe hold. Submit your deliverables to trigger automated test checks and payout.",
        actionLabel: role === "freelancer" && context?.jobId
          ? "Submit Work Deliverable"
          : (role === "client" && context?.jobId ? "View Payment Stages" : undefined),
        actionHref: role === "freelancer" && context?.jobId
          ? `/freelancer/work/${context.jobId}`
          : (role === "client" && context?.jobId ? `/client/jobs/${context.jobId}` : undefined),
        isUrgent: role === "freelancer",
      };

    case "under_review":
    case "submitted":
    case "judging":
    case "evaluating":
      return {
        headline: "Automated verification in progress",
        explanation: "AI Work Checker is executing tests in an isolated sandbox. Payment releases automatically upon passing.",
        isUrgent: false,
      };

    case "disputed":
      return {
        headline: "Dispute under review",
        explanation: "Our AI Dispute Agent is analyzing test logs and code submissions to determine fair allocation.",
        actionLabel: role === "client" ? "Review Dispute Details" : "View Dispute Case",
        actionHref: role === "client" ? "/client/disputes" : "/freelancer/disputes",
        isUrgent: true,
      };

    default:
      return {
        headline: "Project active",
        explanation: "Everything is on track. Follow the guided stages below.",
        isUrgent: false,
      };
  }
}

