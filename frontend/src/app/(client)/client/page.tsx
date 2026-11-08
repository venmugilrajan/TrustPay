"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusCircle, FileText, Lock, CheckCircle2, ArrowRight } from "lucide-react";
import {
  PageHeader,
  StatCard,
  DataTable,
  StatusChip,
  Button,
  EmptyState,
  Skeleton,
} from "@/components/ui";
import { getJobs, getStats, Job, SystemStats } from "@/lib/api";

export default function ClientDashboardPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [jobsData, statsData] = await Promise.all([getJobs(), getStats()]);
      setJobs(jobsData);
      setStats(statsData);
    } catch (err) {
      console.warn("Failed to load client data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute metrics from actual jobs
  const activeContractsCount = jobs.filter((j) =>
    ["negotiating", "awaiting_approval", "approved", "funded", "in_progress", "disputed"].includes(j.status)
  ).length;

  const fundsHeldInEscrow = jobs
    .filter((j) => j.status === "in_progress" || j.status === "funded")
    .reduce((sum, j) => sum + (j.contract?.total_amount || 0), 0);

  const releasedFunds = stats?.total_captured_usd || 0;

  const getActionForJob = (job: Job) => {
    switch (job.status) {
      case "negotiating":
        return { label: "View Dialogue", href: `/client/jobs/${job.id}/negotiate` };
      case "awaiting_approval":
        return { label: "Review & Approve", href: `/client/jobs/${job.id}` };
      case "approved":
        return { label: "Fund Escrow", href: `/client/jobs/${job.id}/fund` };
      case "funded":
      case "in_progress":
        return { label: "View Milestones", href: `/client/jobs/${job.id}` };
      case "disputed":
        return { label: "Review Dispute", href: `/client/disputes` };
      default:
        return { label: "View Details", href: `/client/jobs/${job.id}` };
    }
  };

  const columns = [
    {
      header: "Project Title",
      cell: (job: Job) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-content-primary flex items-center gap-2">
            <span>{job.title}</span>
            {job.is_demo && <StatusChip status="demo_data" className="scale-90" />}
          </div>
          <p className="text-xs text-content-muted line-clamp-1 max-w-sm">
            {job.description}
          </p>
        </div>
      ),
    },
    {
      header: "Freelancer",
      cell: (job: Job) => (
        <span className="text-xs text-content-secondary font-medium">
          {job.freelancer_approved ? "Alex (Verified)" : "Freelancer Agent"}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (job: Job) => <StatusChip status={job.status} />,
    },
    {
      header: "Escrow Value",
      align: "right" as const,
      cell: (job: Job) => (
        <span className="font-serif font-bold text-sm text-content-primary">
          ${(job.contract?.total_amount || job.max_budget).toFixed(2)}
        </span>
      ),
    },
    {
      header: "Next Step",
      align: "right" as const,
      cell: (job: Job) => {
        const action = getActionForJob(job);
        return (
          <Link href={action.href} onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm">
              <span>{action.label}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        );
      },
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Client Hiring Workspace"
        description="Monitor active freelance escrow contracts, fund approved milestones, and review verified deliverables."
        action={
          <Link href="/client/jobs/new">
            <Button size="md" icon={<PlusCircle className="w-4 h-4" />}>
              Post a New Project
            </Button>
          </Link>
        }
      />

      {/* 3 Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-6">
        <StatCard
          label="Active Contracts"
          value={loading ? "..." : activeContractsCount}
          subtext="In negotiation or progress"
          icon={<FileText className="w-5 h-5" />}
        />
        <StatCard
          label="Funds Held in Escrow"
          value={loading ? "..." : `$${fundsHeldInEscrow.toFixed(2)}`}
          subtext="Protected by PayPal authorization"
          icon={<Lock className="w-5 h-5 text-primary" />}
        />
        <StatCard
          label="Released to Freelancers"
          value={loading ? "..." : `$${releasedFunds.toFixed(2)}`}
          subtext="Verified work captured"
          icon={<CheckCircle2 className="w-5 h-5 text-success" />}
        />
      </div>

      {/* Escrow Contracts Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-serif font-bold text-content-primary">
            All Freelance Deals
          </h2>
          <span className="text-xs text-content-muted">
            {jobs.length} total recorded
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton height={48} className="w-full" />
            <Skeleton height={64} className="w-full" />
            <Skeleton height={64} className="w-full" />
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            title="No freelance contracts yet"
            description="Create your first job posting in plain English. Your AI Client Agent will negotiate clear milestones and acceptance criteria."
            actionLabel="Post Your First Project"
            actionHref="/client/jobs/new"
          />
        ) : (
          <DataTable
            columns={columns}
            data={jobs}
            onRowClick={(job) => router.push(`/client/jobs/${job.id}`)}
          />
        )}
      </div>
    </div>
  );
}
