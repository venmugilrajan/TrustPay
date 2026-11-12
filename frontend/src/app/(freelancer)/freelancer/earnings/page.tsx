"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DollarSign, CheckCircle2, Lock, ArrowLeft, CreditCard } from "lucide-react";
import {
  StatCard,
  DataTable,
  StatusChip,
  Skeleton,
  EmptyState,
} from "@/components/ui";
import { getFreelancerEarnings, getFreelancerStats, getFreelancerApplications } from "@/lib/api";

interface PayoutRecord {
  id: string;
  job_id: string;
  contract_id: string;
  milestone_id?: string;
  amount: number;
  currency: string;
  paypal_capture_id?: string;
  note?: string;
  created_at: string;
}

export default function FreelancerEarningsPage() {
  const [earnings, setEarnings] = useState<PayoutRecord[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [earningsData, statsData, appsData] = await Promise.all([
          getFreelancerEarnings(),
          getFreelancerStats().catch(() => null),
          getFreelancerApplications().catch(() => []),
        ]);
        setEarnings(earningsData || []);
        setStats(statsData);
        setApps(appsData || []);
      } catch (err) {
        console.warn("Failed to load earnings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalEarnedFromEntries = earnings.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalEarned =
    (stats && stats.total_earned_usd > 0)
      ? stats.total_earned_usd
      : totalEarnedFromEntries;

  // Active contracts count fallback from applications
  const activeAppsCount = apps.filter((a) => {
    const s = (a.status || a.contract?.status || "").toLowerCase();
    return ["funded", "in_progress", "active"].includes(s);
  }).length;
  const activeCount = (stats && stats.active_contracts > 0) ? stats.active_contracts : activeAppsCount;

  // Pending safe hold: sum of unpaid milestone amounts across active contracts
  const pendingFromApps = apps
    .filter((a) => ["funded", "in_progress", "active"].includes((a.status || a.contract?.status || "").toLowerCase()))
    .reduce((sum, a) => {
      const milestones = a.contract?.milestones || [];
      const pendingSum = milestones
        .filter((m: any) => m.status !== "paid" && m.status !== "passed")
        .reduce((mSum: number, m: any) => mSum + (Number(m.amount) || 0), 0);
      return sum + pendingSum;
    }, 0);

  const pendingSafeHold =
    (stats && stats.awaiting_release_usd > 0)
      ? stats.awaiting_release_usd
      : pendingFromApps;

  const columns = [
    {
      header: "Payment Description",
      cell: (row: PayoutRecord) => (
        <div className="space-y-1">
          <span className="font-semibold text-content-primary block">
            {row.note || "Verified Payment Stage Released"}
          </span>
          <span className="text-xs text-content-muted font-mono">
            Contract: {row.contract_id.slice(0, 8)}...
          </span>
        </div>
      ),
    },
    {
      header: "Status",
      cell: () => <StatusChip status="paid" role="freelancer" />,
    },
    {
      header: "Amount",
      align: "right" as const,
      cell: (row: PayoutRecord) => (
        <div className="text-right">
          <span className="font-serif font-bold text-sm text-accent-emerald">
            +${Number(row.amount || 0).toFixed(2)}
          </span>
          <span className="text-[10px] text-content-muted block">{row.currency || "USD"}</span>
        </div>
      ),
    },
    {
      header: "PayPal Capture Reference",
      align: "right" as const,
      cell: (row: PayoutRecord) => (
        <span className="font-mono text-xs text-content-muted">
          {row.paypal_capture_id || "N/A"}
        </span>
      ),
    },
    {
      header: "Settled At",
      align: "right" as const,
      cell: (row: PayoutRecord) => (
        <span className="text-xs text-content-muted">
          {row.created_at ? new Date(row.created_at).toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }) : "Recent"}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <Link
          href="/freelancer"
          className="inline-flex items-center gap-1.5 text-xs text-content-muted hover:text-content-primary transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Workspace</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-content-primary tracking-tight">
          Freelancer Earnings & Payouts
        </h1>
        <p className="text-sm text-content-secondary mt-1">
          Direct payouts released to your PayPal account upon 100% automated sandbox verification.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          label="Total Earned & Paid"
          value={`$${Number(totalEarned).toFixed(2)}`}
          subtext="Transferred directly to your PayPal"
          icon={<CheckCircle2 className="w-4 h-4 text-accent-emerald" />}
        />
        <StatCard
          label="Held in Safe Hold"
          value={`$${Number(pendingSafeHold).toFixed(2)}`}
          subtext="Guaranteed funds locked for your active contracts"
          icon={<Lock className="w-4 h-4 text-accent" />}
        />
        <StatCard
          label="Active Contracts"
          value={activeCount}
          subtext="Agreements currently in progress"
          icon={<DollarSign className="w-4 h-4 text-content-muted" />}
        />
      </div>

      <div className="content-solid p-6 shadow-soft space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h2 className="text-lg font-bold font-serif text-content-primary">
              Settled Payouts
            </h2>
            <p className="text-xs text-content-secondary mt-0.5">
              Verified records of milestone payments executed by PayPal capture.
            </p>
          </div>
          <span className="text-xs text-content-muted font-medium">
            {earnings.length} payouts recorded
          </span>
        </div>

        {earnings.length === 0 ? (
          <EmptyState
            title="No payouts recorded yet"
            description="Submit your first deliverable to have it verified and trigger an instant payout."
          />
        ) : (
          <div className="overflow-x-auto">
            <DataTable
              columns={columns}
              data={earnings}
            />
          </div>
        )}
      </div>
    </div>
  );
}
