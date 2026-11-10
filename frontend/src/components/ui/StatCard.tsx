"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  helperText?: string;
  trend?: string;
  icon?: React.ReactNode;
  className?: string;
}

export default function StatCard({
  label,
  value,
  subtext,
  helperText,
  trend,
  icon,
  className = "",
}: StatCardProps) {
  const displaySubtext = subtext || helperText;

  return (
    <div
      className={cn(
        "glass p-5 sm:p-6 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glass-strong",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-content-secondary uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <div className="w-8 h-8 rounded-full bg-surface/80 flex items-center justify-center text-content-muted border border-border shadow-subtle">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="text-2xl sm:text-3xl font-bold font-serif text-content-primary tracking-tight">
          {value}
        </div>
        {(displaySubtext || trend) && (
          <div className="mt-1.5 flex items-center gap-2 text-xs text-content-muted leading-relaxed">
            {trend && <span className="font-semibold text-accent">{trend}</span>}
            {displaySubtext && <span>{displaySubtext}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
