"use client";

import React from "react";
import {
  MessageSquare,
  Clock,
  Lock,
  Play,
  Scale,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  XCircle,
  Database,
  ShieldAlert,
} from "lucide-react";
import { getRoleStatusDescriptor, UserRole } from "@/lib/statusLabels";
import { cn } from "@/lib/utils";

export interface StatusChipProps {
  status: string;
  role?: UserRole;
  className?: string;
  showIcon?: boolean;
}

export default function StatusChip({
  status,
  role,
  className = "",
  showIcon = true,
}: StatusChipProps) {
  const norm = (status || "").toLowerCase().replace(/[-\s]/g, "_");

  // If role is provided, use role-aware descriptor
  if (role) {
    const desc = getRoleStatusDescriptor(status, role);
    const styleMap = {
      info: "bg-info/10 text-info border-info/20",
      warning: "bg-warning/10 text-warning border-warning/25",
      success: "bg-success/10 text-success border-success/25",
      neutral: "bg-surface text-content-secondary border-border",
      danger: "bg-danger/10 text-danger border-danger/25",
    };

    const iconMap: Record<string, React.ReactNode> = {
      MessageSquare: <MessageSquare className="w-3 h-3 stroke-[2.2]" />,
      Clock: <Clock className="w-3 h-3 stroke-[2.2]" />,
      Lock: <Lock className="w-3 h-3 stroke-[2.2]" />,
      Play: <Play className="w-3 h-3 stroke-[2.2]" />,
      Scale: <Scale className="w-3 h-3 stroke-[2.2]" />,
      CheckCircle2: <CheckCircle2 className="w-3 h-3 stroke-[2.2]" />,
      AlertTriangle: <AlertTriangle className="w-3 h-3 stroke-[2.2]" />,
      RotateCcw: <RotateCcw className="w-3 h-3 stroke-[2.2]" />,
      XCircle: <XCircle className="w-3 h-3 stroke-[2.2]" />,
    };

    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-pill border shadow-subtle transition-colors",
          styleMap[desc.badgeStyle],
          className
        )}
      >
        {showIcon && (iconMap[desc.iconName] || <Clock className="w-3 h-3" />)}
        <span>{desc.label}</span>
      </span>
    );
  }

  // Fallback role-agnostic config (strictly NO emojis, plain language)
  const config: Record<
    string,
    { label: string; icon: React.ReactNode; style: string }
  > = {
    negotiating: {
      label: "Negotiating",
      icon: <MessageSquare className="w-3 h-3 stroke-[2.2]" />,
      style: "bg-info/10 text-info border-info/20",
    },
    awaiting_approval: {
      label: "Needs Decision",
      icon: <Clock className="w-3 h-3 stroke-[2.2]" />,
      style: "bg-warning/10 text-warning border-warning/25",
    },
    awaiting_freelancer_acceptance: {
      label: "Client Approved · Waiting for Freelancer",
      icon: <Clock className="w-3 h-3 stroke-[2.2]" />,
      style: "bg-warning/10 text-warning border-warning/25",
    },
    client_accepted: {
      label: "Client Approved · Waiting for Freelancer",
      icon: <Clock className="w-3 h-3 stroke-[2.2]" />,
      style: "bg-warning/10 text-warning border-warning/25",
    },
    thanksgiving: {
      label: "Thank You Sent",
      icon: <CheckCircle2 className="w-3 h-3 stroke-[2.2]" />,
      style: "bg-surface text-content-muted border-border",
    },
    not_selected: {
      label: "Other Quote Selected",
      icon: <CheckCircle2 className="w-3 h-3 stroke-[2.2]" />,
      style: "bg-surface text-content-muted border-border",
    },
    approved: {
      label: "Approved · Ready to Hold",
      icon: <CheckCircle2 className="w-3 h-3 stroke-[2.2]" />,
      style: "bg-warning/10 text-warning border-warning/25",
    },
    funded: {
      label: "Money Held Safely",
      icon: <Lock className="w-3 h-3 stroke-[2.2]" />,
      style: "bg-success/10 text-success border-success/25",
    },
    in_progress: {
      label: "Work Underway",
      icon: <Play className="w-3 h-3 stroke-[2.2]" />,
      style: "bg-info/10 text-info border-info/20",
    },
    under_review: {
      label: "Work Under AI Review",
      icon: <Scale className="w-3 h-3 stroke-[2.2]" />,
      style: "bg-warning/10 text-warning border-warning/25",
    },
    submitted: {
      label: "Deliverable Submitted",
      icon: <Clock className="w-3 h-3 stroke-[2.2]" />,
      style: "bg-warning/10 text-warning border-warning/25",
    },
    verified: {
      label: "Verified & Passed",
      icon: <CheckCircle2 className="w-3 h-3 stroke-[2.2]" />,
      style: "bg-success/10 text-success border-success/25",
    },
    pass: {
      label: "Passed (100%)",
      icon: <CheckCircle2 className="w-3 h-3 stroke-[2.2]" />,
      style: "bg-success/10 text-success border-success/25",
    },
    passed: {
      label: "Passed & Releasing",
      icon: <CheckCircle2 className="w-3 h-3 stroke-[2.2]" />,
      style: "bg-success/10 text-success border-success/25",
    },
    paid: {
      label: "Payment Released",
      icon: <CheckCircle2 className="w-3 h-3 stroke-[2.2]" />,
      style: "bg-success/10 text-success border-success/25",
    },
    completed: {
      label: "Completed",
      icon: <CheckCircle2 className="w-3 h-3 stroke-[2.2]" />,
      style: "bg-success/10 text-success border-success/25",
    },
    disputed: {
      label: "Under Arbitration",
      icon: <AlertTriangle className="w-3 h-3 stroke-[2.2]" />,
      style: "bg-danger/10 text-danger border-danger/25",
    },
    refunded: {
      label: "Funds Returned",
      icon: <RotateCcw className="w-3 h-3 stroke-[2.2]" />,
      style: "bg-surface text-content-secondary border-border",
    },
    voided: {
      label: "Hold Voided",
      icon: <XCircle className="w-3 h-3 stroke-[2.2]" />,
      style: "bg-surface text-content-muted border-border",
    },
    expired: {
      label: "Expired",
      icon: <Clock className="w-3 h-3 stroke-[2.2]" />,
      style: "bg-danger/10 text-danger border-danger/25",
    },
    open: {
      label: "Open for Proposals",
      icon: <Clock className="w-3 h-3 stroke-[2.2]" />,
      style: "bg-info/10 text-info border-info/20",
    },
    no_deal: {
      label: "Budget Mismatch",
      icon: <AlertTriangle className="w-3 h-3 stroke-[2.2]" />,
      style: "bg-warning/10 text-warning border-warning/25",
    },
    closed: {
      label: "Job Closed",
      icon: <XCircle className="w-3 h-3 stroke-[2.2]" />,
      style: "bg-surface text-content-secondary border-border",
    },
    demo_data: {
      label: "Demo Scenario",
      icon: <Database className="w-3 h-3 stroke-[2.2]" />,
      style: "bg-accent/10 text-accent border-accent/25",
    },
    needs_manual_review: {
      label: "Manual Check Needed",
      icon: <AlertTriangle className="w-3 h-3 stroke-[2.2]" />,
      style: "bg-warning/10 text-warning border-warning/25",
    },
    failed_closed: {
      label: "Sandbox Failed Closed",
      icon: <ShieldAlert className="w-3 h-3 stroke-[2.2]" />,
      style: "bg-danger/10 text-danger border-danger/25",
    },
  };

  const item = config[norm] || {
    label: status.replace(/_/g, " "),
    icon: <Clock className="w-3 h-3 stroke-[2.2]" />,
    style: "bg-surface text-content-secondary border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-pill border shadow-subtle transition-colors",
        item.style,
        className
      )}
    >
      {showIcon && item.icon}
      <span>{item.label}</span>
    </span>
  );
}
