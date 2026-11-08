import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import Card from "./Card";

export interface CriterionCardProps {
  id: string;
  text: string;
  weight?: number;
  passed?: boolean;
  score?: number;
  reasoning?: string;
  evidence?: string;
}

export default function CriterionCard({
  id,
  text,
  weight,
  passed,
  score,
  reasoning,
  evidence,
}: CriterionCardProps) {
  const isEvaluated = passed !== undefined;

  return (
    <Card padding="sm" className="space-y-2 border-border-subtle bg-surface">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 flex-1">
          {isEvaluated && (
            <span className="mt-0.5 shrink-0">
              {passed ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : (
                <XCircle className="w-4 h-4 text-danger" />
              )}
            </span>
          )}
          <div>
            <p className="text-sm font-medium text-content-primary leading-snug">{text}</p>
            {weight != null && (
              <span className="text-[11px] text-content-muted">
                Weight: {(weight * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </div>

        {score != null && (
          <span
            className={`px-2 py-0.5 text-xs font-mono font-semibold rounded-full border ${
              score >= 0.85
                ? "bg-success-bg text-success border-success-border"
                : score >= 0.5
                ? "bg-warning-bg text-warning border-warning-border"
                : "bg-danger-bg text-danger border-danger-border"
            }`}
          >
            {(score * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {reasoning && (
        <p className="text-xs text-content-secondary bg-cream-100 p-2.5 rounded-btn border border-border-subtle">
          <strong className="text-content-primary">Judge: </strong>
          {reasoning}
        </p>
      )}

      {evidence && (
        <div className="text-[11px] text-content-muted font-mono bg-cream-200/50 p-2 rounded-btn overflow-x-auto">
          {evidence}
        </div>
      )}
    </Card>
  );
}
