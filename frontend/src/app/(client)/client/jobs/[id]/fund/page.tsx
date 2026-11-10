"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Lock, ArrowLeft, CheckCircle2, Shield } from "lucide-react";
import { StatusChip, Skeleton } from "@/components/ui";
import PayPalButton from "@/components/PayPalButton";
import ProgressTracker from "@/components/glass/ProgressTracker";
import WhatToDoNow from "@/components/glass/WhatToDoNow";
import GlassCard from "@/components/glass/GlassCard";
import { getJob, Job } from "@/lib/api";

export default function ClientFundEscrowPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  const loadJobData = async () => {
    try {
      const data = await getJob(jobId);
      setJob(data);
    } catch (err) {
      console.warn("Failed to load funding job:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobData();
  }, [jobId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!job) return null;

  const totalAmount = Number(job.contract?.total_amount || job.max_budget || 0);
  const currency = job.contract?.currency || "USD";

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      {/* Header */}
      <div>
        <Link
          href={`/client/jobs/${job.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-content-muted hover:text-content-primary transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Project Details</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-content-primary tracking-tight">
              Authorize Safe Hold via PayPal
            </h1>
            <p className="text-sm text-content-secondary mt-1">
              Authorize payment to be held safely by PayPal. Funds remain in institutional custody until work passes tests.
            </p>
          </div>
          <StatusChip status={job.status} role="client" />
        </div>
      </div>

      {/* Visual Guided Progress Tracker */}
      <ProgressTracker currentStep="approved" />

      {/* Prominent Guidance */}
      <WhatToDoNow
        headline="Authorize safe hold to begin project"
        explanation="Both parties agreed on terms. Use the verified PayPal button below to place funds into safe hold. The freelancer will begin building immediately."
        isUrgent={true}
      />

      {/* Contract Snapshot */}
      <div className="content-solid p-6 shadow-soft space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-border">
          <div>
            <span className="text-[11px] font-bold text-content-muted uppercase tracking-wider block">
              Agreed Project Contract
            </span>
            <h2 className="text-lg font-serif font-bold text-content-primary mt-1">
              {job.title}
            </h2>
            <p className="text-xs text-content-secondary line-clamp-2 mt-1">
              {job.description}
            </p>
          </div>
          <div className="text-left sm:text-right flex-shrink-0">
            <span className="text-[11px] font-bold text-content-muted uppercase tracking-wider block">
              Safe Hold Amount
            </span>
            <span className="text-2xl font-serif font-bold text-accent-emerald">
              ${Number(totalAmount || 0).toFixed(2)}
            </span>
            <span className="text-[10px] text-content-muted block">{currency} Authorized</span>
          </div>
        </div>

        {/* Payment Stage Release Schedule */}
        {job.contract?.milestones && (
          <div className="space-y-3">
            <span className="text-xs font-semibold text-content-primary block">
              Payment Stage Release Schedule ({job.contract.milestones.length} stages)
            </span>
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              {job.contract.milestones.map((m, idx) => (
                <div key={m.id} className="p-3.5 rounded-2xl glass-subtle border border-border flex items-center justify-between">
                  <div className="truncate mr-3">
                    <span className="font-semibold text-content-primary block truncate">
                      Stage {idx + 1}: {m.title}
                    </span>
                    <span className="text-[11px] text-content-muted">
                      Due {m.due_date}
                    </span>
                  </div>
                  <span className="font-serif font-bold text-sm text-content-primary shrink-0">
                    ${Number(m.amount || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* PayPal Authorization Card */}
      <div className="glass-strong p-8 text-center space-y-6 shadow-glass-strong border border-border">
        <div className="w-12 h-12 rounded-2xl bg-accent-emerald/15 text-accent-emerald flex items-center justify-center mx-auto">
          <Shield className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h2 className="font-serif font-bold text-xl text-content-primary">
            PayPal Orders v2 Safe Hold
          </h2>
          <p className="text-xs text-content-secondary leading-relaxed">
            Clicking the PayPal button authorizes a payment intent (intent: AUTHORIZE). Funds are held safely under PayPal custody and never transferred until you or automated tests verify work.
          </p>
        </div>

        <div className="max-w-xs mx-auto">
          <PayPalButton
            jobId={job.id}
            totalAmount={totalAmount}
            currency={currency}
            onAuthorized={() => {
              router.push(`/client/jobs/${job.id}`);
            }}
          />
        </div>

        <div className="pt-2 text-[11px] text-content-muted flex items-center justify-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-accent-emerald" />
          <span>Connected to PayPal Sandbox API Environment</span>
        </div>
      </div>
    </div>
  );
}
