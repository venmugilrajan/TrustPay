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
} from "lucide-react";

export type StatusType =
  | "negotiating"
  | "awaiting_approval"
  | "approved"
  | "funded"
  | "in_progress"
  | "under_review"
  | "verified"
  | "paid"
  | "completed"
  | "disputed"
  | "refunded"
  | "voided"
  | "expired"
  | "no_deal"
  | "demo_data";

export interface StatusChipProps {
  status: string;
  className?: string;
}

export default function StatusChip({ status, className = "" }: StatusChipProps) {
  const norm = (status || "").toLowerCase().replace(/[-\s]/g, "_");

  const config: Record<
    string,
    { label: string; icon: React.ReactNode; bg: string; text: string; border: string }
  > = {
    negotiating: {
      label: "Negotiating",
      icon: <MessageSquare className="w-3 h-3" />,
      bg: "bg-info-bg",
      text: "text-info",
      border: "border-info-border",
    },
    awaiting_approval: {
      label: "Awaiting Approval",
      icon: <Clock className="w-3 h-3" />,
      bg: "bg-warning-bg",
      text: "text-warning",
      border: "border-warning-border",
    },
    approved: {
      label: "Approved (Ready to Fund)",
      icon: <CheckCircle2 className="w-3 h-3" />,
      bg: "bg-success-bg",
      text: "text-success",
      border: "border-success-border",
    },
    funded: {
      label: "Escrow Funded",
      icon: <Lock className="w-3 h-3" />,
      bg: "bg-primary-subtle",
      text: "text-primary",
      border: "border-[#C5D7CE]",
    },
    in_progress: {
      label: "In Progress",
      icon: <Play className="w-3 h-3" />,
      bg: "bg-info-bg",
      text: "text-info",
      border: "border-info-border",
    },
    under_review: {
      label: "Under Review",
      icon: <Scale className="w-3 h-3" />,
      bg: "bg-warning-bg",
      text: "text-warning",
      border: "border-warning-border",
    },
    verified: {
      label: "Verified & Passed",
      icon: <CheckCircle2 className="w-3 h-3" />,
      bg: "bg-success-bg",
      text: "text-success",
      border: "border-success-border",
    },
    paid: {
      label: "Paid",
      icon: <CheckCircle2 className="w-3 h-3" />,
      bg: "bg-success-bg",
      text: "text-success",
      border: "border-success-border",
    },
    completed: {
      label: "Completed",
      icon: <CheckCircle2 className="w-3 h-3" />,
      bg: "bg-success-bg",
      text: "text-success",
      border: "border-success-border",
    },
    disputed: {
      label: "Disputed",
      icon: <AlertTriangle className="w-3 h-3" />,
      bg: "bg-danger-bg",
      text: "text-danger",
      border: "border-danger-border",
    },
    refunded: {
      label: "Refunded",
      icon: <RotateCcw className="w-3 h-3" />,
      bg: "bg-cream-200",
      text: "text-content-secondary",
      border: "border-border-subtle",
    },
    voided: {
      label: "Voided",
      icon: <XCircle className="w-3 h-3" />,
      bg: "bg-cream-200",
      text: "text-content-muted",
      border: "border-border-subtle",
    },
    expired: {
      label: "Expired",
      icon: <Clock className="w-3 h-3" />,
      bg: "bg-danger-bg",
      text: "text-danger",
      border: "border-danger-border",
    },
    no_deal: {
      label: "No Deal",
      icon: <XCircle className="w-3 h-3" />,
      bg: "bg-danger-bg",
      text: "text-danger",
      border: "border-danger-border",
    },
    demo_data: {
      label: "DEMO DATA",
      icon: <Database className="w-3 h-3" />,
      bg: "bg-accent-subtle",
      text: "text-accent",
      border: "border-[#ECD1C7]",
    },
  };

  const item = config[norm] || {
    label: status,
    icon: <Clock className="w-3 h-3" />,
    bg: "bg-cream-200",
    text: "text-content-secondary",
    border: "border-border-subtle",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${item.bg} ${item.text} ${item.border} ${className}`}
    >
      {item.icon}
      <span>{item.label}</span>
    </span>
  );
}
