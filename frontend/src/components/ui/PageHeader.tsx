import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  description,
  backHref,
  backLabel = "Back",
  action,
  badge,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`space-y-2 mb-8 ${className}`}>
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs text-content-secondary hover:text-content-primary font-medium transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{backLabel}</span>
        </Link>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-bold font-serif text-content-primary">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="mt-1 text-sm text-content-secondary">
              {description}
            </p>
          )}
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

