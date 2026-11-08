"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DollarSign, CheckCircle2, Lock, ArrowRight, CreditCard } from "lucide-react";
import {
  PageHeader,
  StatCard,
  DataTable,
  CopyableId,
  StatusChip,
  Skeleton,
  EmptyState,
} from "@/components/ui";
import { getJobs, getStats, Job, SystemStats } from "@/lib/api";

interface PayoutRecord {
  id: string;
  jobId: string;
  jobTitle: string;
  milestoneTitle: string;
  amount: number;
  captureId?: string;
  status: string;
  date: string;
}

export default function FreelancerEarningsPage() {
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [jobs, statsData] = await Promise.all([getJobs(), getStats()]);
        setStats(statsData);

        const records: PayoutRecord[] = [];
        jobs.forEach((job) => {
          if (job.contract?.milestones) {
            job.contract.milestones.forEach((m) => {
              if (m.captured_amount > 0 || m.status === "paid") {
                records.push({
                  id: m.id,
                  jobId: job.id,
                  jobTitle: job.title,
                  milestoneTitle: m.title,
                  amount: m.captured_amount || m.amount,
                  captureId: m.paypal_capture_id,
                  status: "paid",
                  date: m.due_date || job.deadline,
                });
              } else if (job.paypal_authorization_id && (job.status === "in_progress" || job.status === "funded")) {
                records.push({
                  id: m.id,
                  jobId: job.id,
                  jobTitle: job.title,
                  milestoneTitle: m.title,
                  amount: m.amount,
                  status: "escrow_locked",
                  date: m.due_date || job.deadline,
                });
              }
            });
          }
        });

        setPayouts(records);
      } catch (err) {
        console.warn("Failed to load earnings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalEarned = stats?.total_captured_usd || 0;
  const pendingEscrow = payouts
    .filter((p) => p.status === "escrow_locked")
    .reduce((sum, p) => sum + p.amount, 0);

  const columns = [
    {
      header: "Project & Milestone",
      cell: (row: PayoutRecord) => (
        <div className="space-y-0.5">
          <Link
            href={`/freelancer/work/${row.jobId}`}
            className="font-semibold text-content-primary hover:underline block"
          >
            {row.jobTitle}
          </Link>
          <span className="text-xs text-content-secondary">
            Milestone: {row.milestoneTitle}
          </span>
        </div>
      ),
    },
    {
      header: "PayPal Capture ID",
      cell: (row: PayoutRecord) =>
        row.captureId ? (
          <CopyableId idText={row.captureId} />
        ) : (
          <span className="text-xs text-content-muted font-mono">Held in Authorization</span>
        ),
    },
    {
      header: "Status",
      cell: (row: PayoutRecord) => <StatusChip status={row.status} />,
    },
    {
      header: "Amount",
      align: "right" as const,
      cell: (row: PayoutRecord) => (
        <span className="font-serif font-bold text-sm text-primary">
          ${row.amount.toFixed(2)} USD
        </span>
      ),
    },
    {
      header: "Date",
      align: "right" as const,
      cell: (row: PayoutRecord) => (
        <span className="text-xs text-content-muted font-mono">
          {row.date}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Earnings & Payout Ledger"
        description="Track released milestone payouts captured via PayPal Orders v2 and monitor pending escrow allocations."
        backHref="/freelancer"
        backLabel="Back to Dashboard"
      />

      {/* 2 Big Stat Cards */}
      <div className="grid sm:grid-cols-2 gap-6">
        <StatCard
          label="Total Captured Payouts"
          value={loading ? "..." : `$${totalEarned.toFixed(2)}`}
          subtext="Released to your PayPal account"
          icon={<CheckCircle2 className="w-5 h-5 text-success" />}
        />
        <StatCard
          label="Guaranteed Pending Escrow"
          value={loading ? "..." : `$${pendingEscrow.toFixed(2)}`}
          subtext="Locked in client authorizations"
          icon={<Lock className="w-5 h-5 text-primary" />}
        />
      </div>

      {/* Ledger Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-serif font-bold text-content-primary">
            Payout History & Escrow Receivables
          </h2>
          <span className="text-xs text-content-muted font-mono">
            {payouts.length} milestone items
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton height={48} className="w-full" />
            <Skeleton height={64} className="w-full" />
            <Skeleton height={64} className="w-full" />
          </div>
        ) : payouts.length === 0 ? (
          <EmptyState
            icon={<DollarSign className="w-6 h-6" />}
            title="No payout history yet"
            description="When deliverables pass AI Judge verification, captured PayPal payouts will appear here with transaction receipts."
            actionLabel="View Active Work"
            actionHref="/freelancer/work"
          />
        ) : (
          <DataTable columns={columns} data={payouts} />
        )}
      </div>
    </div>
  );
}
