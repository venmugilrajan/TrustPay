"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Lock, ArrowLeft, CheckCircle2, Shield } from "lucide-react";
import { PageHeader, Card, StatusChip, Skeleton, NextStepCard } from "@/components/ui";
import PayPalButton from "@/components/PayPalButton";
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
      <div className="max-w-xl mx-auto space-y-6">
        <Skeleton height={40} className="w-1/3" />
        <Skeleton height={200} className="w-full" />
      </div>
    );
  }

  if (!job) return null;

  const totalAmount = job.contract?.total_amount || job.max_budget;
  const currency = job.contract?.currency || "USD";

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <PageHeader
        title="Fund Escrow with PayPal"
        description="Authorize payment funds to be securely held in escrow for this contract."
        backHref={`/client/jobs/${job.id}`}
        backLabel="Back to Contract Details"
        badge={<StatusChip status={job.status} />}
      />

      <NextStepCard stepText="Money is held by PayPal and only released when work passes verification." />

      {/* Contract Snapshot */}
      <Card padding="md" className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-content-muted uppercase tracking-wider">
              Project Contract
            </span>
            <h3 className="text-lg font-serif font-bold text-content-primary mt-0.5">
              {job.title}
            </h3>
            <p className="text-xs text-content-secondary line-clamp-2 mt-1">
              {job.description}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-content-muted block uppercase tracking-wider">
              Escrow Amount
            </span>
            <span className="text-2xl font-serif font-bold text-primary">
              ${totalAmount.toFixed(2)} {currency}
            </span>
          </div>
        </div>

        {/* Milestone Breakdown Summary */}
        {job.contract?.milestones && (
          <div className="pt-3 border-t border-border-subtle space-y-2">
            <span className="text-xs font-semibold text-content-secondary block">
              Escrow Milestone Release Schedule ({job.contract.milestones.length} milestones)
            </span>
            <div className="grid sm:grid-cols-2 gap-2 text-xs">
              {job.contract.milestones.map((m, idx) => (
                <div key={m.id} className="p-2.5 rounded bg-surface-subtle border border-border-subtle flex justify-between">
                  <span className="font-medium text-content-primary truncate mr-2">
                    {idx + 1}. {m.title}
                  </span>
                  <span className="font-serif font-bold text-content-primary shrink-0">
                    ${m.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* PayPal Orders v2 Funding Box */}
      <PayPalButton
        jobId={job.id}
        totalAmount={totalAmount}
        currency={currency}
        onAuthorized={() => {
          router.push(`/client/jobs/${job.id}`);
        }}
      />
    </div>
  );
}
