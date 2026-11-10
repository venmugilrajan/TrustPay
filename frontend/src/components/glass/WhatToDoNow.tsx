"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import GlassButton from "./GlassButton";

interface WhatToDoNowProps {
  headline: string;
  explanation: string;
  actionLabel?: string;
  actionHref?: string;
  onActionClick?: () => void;
  isUrgent?: boolean;
  className?: string;
  secondaryInfo?: string;
}

export default function WhatToDoNow({
  headline,
  explanation,
  actionLabel,
  actionHref,
  onActionClick,
  isUrgent = false,
  className = "",
  secondaryInfo,
}: WhatToDoNowProps) {
  return (
    <div
      className={cn(
        "what-to-do-now flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200",
        isUrgent && "border-warning/40 shadow-soft",
        className
      )}
    >
      <div className="flex items-start gap-3.5">
        <div
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
            isUrgent
              ? "bg-warning/20 text-warning"
              : "bg-accent/15 text-accent"
          )}
        >
          {isUrgent ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-content-muted">
              What to do now
            </span>
            {secondaryInfo && (
              <span className="text-[11px] text-content-muted">· {secondaryInfo}</span>
            )}
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-content-primary mt-0.5">
            {headline}
          </h2>
          <p className="text-sm text-content-secondary mt-1 leading-relaxed max-w-2xl">
            {explanation}
          </p>
        </div>
      </div>

      {actionLabel && (
        <div className="flex-shrink-0 pt-2 md:pt-0 self-start md:self-center">
          {actionHref ? (
            <Link href={actionHref}>
              <GlassButton
                variant={isUrgent ? "primary" : "primary"}
                size="md"
                className="whitespace-nowrap"
                icon={<ArrowRight className="w-4 h-4 ml-1 order-last" />}
              >
                {actionLabel}
              </GlassButton>
            </Link>
          ) : (
            <GlassButton
              variant="primary"
              size="md"
              onClick={onActionClick}
              className="whitespace-nowrap"
              icon={<ArrowRight className="w-4 h-4 ml-1 order-last" />}
            >
              {actionLabel}
            </GlassButton>
          )}
        </div>
      )}
    </div>
  );
}

