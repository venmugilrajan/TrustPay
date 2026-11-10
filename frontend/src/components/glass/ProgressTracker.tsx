"use client";

import React from "react";
import { Check, Clock, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProjectStep =
  | "posted"
  | "applied"
  | "negotiating"
  | "approved"
  | "funded"
  | "in_progress"
  | "completed";

const STEPS: { id: ProjectStep; label: string; explanation: string }[] = [
  { id: "posted", label: "Posted", explanation: "Job posted to the marketplace" },
  { id: "applied", label: "Applied", explanation: "Freelancer submitted proposal" },
  { id: "negotiating", label: "Agreeing on terms", explanation: "Autonomous agents align on price and stages" },
  { id: "approved", label: "You approve", explanation: "Both sides confirm agreed terms" },
  { id: "funded", label: "Money held", explanation: "Funds secured in safe hold via PayPal" },
  { id: "in_progress", label: "Work in progress", explanation: "Deliverables built & tested in sandbox" },
  { id: "completed", label: "Paid", explanation: "Milestones verified and funds released" },
];

export function getProjectStepFromStatus(status: string): ProjectStep {
  const norm = (status || "").toLowerCase().replace(/[-\s]/g, "_");
  switch (norm) {
    case "open":
      return "posted";
    case "applied":
      return "applied";
    case "negotiating":
    case "in_negotiation":
      return "negotiating";
    case "awaiting_approval":
    case "approved":
      return "approved";
    case "funded":
      return "funded";
    case "in_progress":
    case "under_review":
    case "submitted":
    case "judging":
      return "in_progress";
    case "verified":
    case "paid":
    case "completed":
      return "completed";
    default:
      return "negotiating";
  }
}

interface ProgressTrackerProps {
  currentStep: ProjectStep | string;
  className?: string;
  compact?: boolean;
}

export default function ProgressTracker({
  currentStep,
  className = "",
  compact = false,
}: ProgressTrackerProps) {
  const normalizedStep = typeof currentStep === "string" && !STEPS.some((s) => s.id === currentStep)
    ? getProjectStepFromStatus(currentStep)
    : (currentStep as ProjectStep);

  const currentIndex = STEPS.findIndex((s) => s.id === normalizedStep);
  const activeStep = STEPS[currentIndex] || STEPS[0];

  return (
    <div className={cn("glass-subtle p-4 sm:p-5", className)}>
      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
        {STEPS.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center gap-1.5 flex-1 min-w-[70px]">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200",
                    isDone && "bg-accent-emerald text-white shadow-subtle",
                    isCurrent && "bg-accent text-white ring-4 ring-accent/20 scale-110",
                    !isDone && !isCurrent && "bg-border text-content-muted"
                  )}
                >
                  {isDone ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : isCurrent ? (
                    <CircleDot className="w-3.5 h-3.5 animate-pulse" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[11px] font-medium text-center leading-tight transition-colors",
                    isCurrent && "text-content-primary font-bold",
                    isDone && "text-content-secondary",
                    !isDone && !isCurrent && "text-content-muted"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-[2px] flex-1 min-w-[12px] -mt-5 transition-colors duration-200",
                    idx < currentIndex ? "bg-accent-emerald" : "bg-border"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {!compact && (
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-content-secondary">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-content-primary">Current Stage:</span>
            <span>{activeStep.label} – {activeStep.explanation}</span>
          </div>
          <span className="text-content-muted text-[11px]">
            Step {currentIndex + 1} of {STEPS.length}
          </span>
        </div>
      )}
    </div>
  );
}

