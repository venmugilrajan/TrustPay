import React from "react";
import { Check, Clock, Play, CheckCircle2, AlertTriangle } from "lucide-react";

export type StepState = "pending" | "current" | "completed" | "failed";

export interface StepItem {
  id: string | number;
  title: string;
  description?: string;
  date?: string;
  state: StepState;
}

export interface StepperProps {
  steps: StepItem[];
  orientation?: "vertical" | "horizontal";
  className?: string;
}

export default function Stepper({
  steps,
  orientation = "vertical",
  className = "",
}: StepperProps) {
  if (orientation === "horizontal") {
    return (
      <div className={`flex items-center justify-between w-full ${className}`}>
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          const isDone = step.state === "completed";
          const isCurrent = step.state === "current";

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center text-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs transition-colors border ${
                    isDone
                      ? "bg-primary text-primary-foreground border-primary"
                      : isCurrent
                      ? "bg-surface border-primary text-primary font-bold ring-2 ring-primary/20"
                      : "bg-surface-subtle border-border-subtle text-content-muted"
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4" /> : idx + 1}
                </div>
                <span className="mt-2 text-xs font-medium text-content-primary">
                  {step.title}
                </span>
              </div>
              {!isLast && (
                <div
                  className={`flex-1 h-0.5 mx-3 ${
                    isDone ? "bg-primary" : "bg-border-subtle"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        const isDone = step.state === "completed";
        const isCurrent = step.state === "current";
        const isFailed = step.state === "failed";

        return (
          <div key={step.id} className="relative flex items-start gap-4">
            {!isLast && (
              <span
                className={`absolute left-4 top-8 -bottom-6 w-0.5 ${
                  isDone ? "bg-primary" : "bg-border-subtle"
                }`}
                aria-hidden="true"
              />
            )}

            <div
              className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-medium border z-10 ${
                isDone
                  ? "bg-primary text-primary-foreground border-primary"
                  : isCurrent
                  ? "bg-surface border-primary text-primary font-bold ring-4 ring-primary/10"
                  : isFailed
                  ? "bg-danger text-surface border-danger"
                  : "bg-surface border-border-subtle text-content-muted"
              }`}
            >
              {isDone ? (
                <Check className="w-4 h-4" />
              ) : isFailed ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                idx + 1
              )}
            </div>

            <div className="flex-1 pt-0.5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-content-primary">
                  {step.title}
                </h4>
                {step.date && (
                  <span className="text-xs text-content-muted font-mono">
                    {step.date}
                  </span>
                )}
              </div>
              {step.description && (
                <p className="mt-1 text-xs text-content-secondary leading-relaxed">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
