import React from "react";
import Button from "./Button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-center rounded-card border border-dashed border-border-subtle bg-surface/50 ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-full bg-surface-subtle border border-border-subtle flex items-center justify-center text-primary mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-serif font-bold text-content-primary">
        {title}
      </h3>
      <p className="mt-1.5 text-xs text-content-secondary max-w-sm leading-relaxed">
        {description}
      </p>

      {actionLabel && (
        <div className="mt-5">
          {actionHref ? (
            <a href={actionHref}>
              <Button size="sm">{actionLabel}</Button>
            </a>
          ) : onAction ? (
            <Button size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}

