"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Clock,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  AlertCircle,
  Upload,
  MessageSquare,
  Lock,
} from "lucide-react";
import {
  PageHeader,
  StatCard,
  Card,
  StatusChip,
  Button,
  EmptyState,
  Skeleton,
} from "@/components/ui";
import { getJobs, getStats, Job, SystemStats } from "@/lib/api";

export default function FreelancerDashboardPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [jobsData, statsData] = await Promise.all([getJobs(), getStats()]);
        setJobs(jobsData);
        setStats(statsData);
      } catch (err) {
        console.warn("Failed to load freelancer dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Compute metrics from actual jobs
  const activeContracts = jobs.filter((j) =>
    ["negotiating", "awaiting_approval", "approved", "funded", "in_progress", "disputed"].includes(j.status)
  );

  const pendingVerificationCount = jobs.filter((j) =>
    j.contract?.milestones?.some((m) => m.status === "under_review" || m.status === "submitted")
  ).length;

  const totalEarned = stats?.total_captured_usd || 0;

  const awaitingReleaseAmount = jobs
    .filter((j) => j.status === "in_progress" || j.status === "funded")
    .reduce((sum, j) => sum + (j.contract?.total_amount || 0), 0);

  // Compute "Next action needed" list
  const nextActions: {
    jobId: string;
    jobTitle: string;
    actionText: string;
    buttonLabel: string;
    href: string;
    urgency: "high" | "normal";
  }[] = [];

  jobs.forEach((job) => {
    if (job.status === "negotiating") {
      nextActions.push({
        jobId: job.id,
        jobTitle: job.title,
        actionText: "Review counter-proposals and agree on milestone terms",
        buttonLabel: "View Negotiation",
        href: `/freelancer/work/${job.id}/negotiate`,
        urgency: "normal",
      });
    } else if (job.status === "awaiting_approval" && !job.freelancer_approved) {
      nextActions.push({
        jobId: job.id,
        jobTitle: job.title,
        actionText: "Both agents reached agreement. Review and confirm contract.",
        buttonLabel: "Confirm Contract",
        href: `/freelancer/work/${job.id}`,
        urgency: "high",
      });
    } else if (job.status === "in_progress" || job.status === "funded") {
      const pendingMilestone = job.contract?.milestones?.find(
        (m) => m.status === "pending" || m.status === "in_progress"
      );
      if (pendingMilestone) {
        nextActions.push({
          jobId: job.id,
          jobTitle: job.title,
          actionText: `Submit deliverables for "${pendingMilestone.title}" ($${pendingMilestone.amount.toFixed(2)})`,
          buttonLabel: "Submit Work",
          href: `/freelancer/work/${job.id}`,
          urgency: "high",
        });
      }
    }
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Freelancer Workspace"
        description="Deliver verified milestones, test deliverables against AI acceptance criteria, and receive guaranteed PayPal payouts."
        action={
          <Link href="/freelancer/opportunities">
            <Button size="md" variant="secondary">
              Browse Available Deals
            </Button>
          </Link>
        }
      />

      {/* "Next Action Needed" Alert Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-content-primary">
            Next Action Needed ({nextActions.length})
          </h2>
        </div>

        {loading ? (
          <Skeleton height={72} className="w-full" />
        ) : nextActions.length === 0 ? (
          <Card padding="sm" className="bg-success-bg border-success-border text-xs text-success flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>All caught up! No urgent deliverables or approvals waiting on you.</span>
          </Card>
        ) : (
          <div className="space-y-2">
            {nextActions.slice(0, 3).map((item, idx) => (
              <Card
                key={idx}
                padding="sm"
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-border-strong bg-surface hover:bg-cream-100 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-content-primary text-sm font-serif">
                      {item.jobTitle}
                    </span>
                    {item.urgency === "high" && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-accent-subtle text-accent border border-[#ECD1C7]">
                        Action Required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-content-secondary mt-0.5">
                    {item.actionText}
                  </p>
                </div>

                <Link href={item.href} className="shrink-0">
                  <Button size="sm">
                    <span>{item.buttonLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Active Contracts"
          value={loading ? "..." : activeContracts.length}
          subtext="Under active agreement"
          icon={<Briefcase className="w-5 h-5" />}
        />
        <StatCard
          label="Pending Verification"
          value={loading ? "..." : pendingVerificationCount}
          subtext="Deliverables under AI review"
          icon={<Clock className="w-5 h-5 text-warning" />}
        />
        <StatCard
          label="Earned & Paid"
          value={loading ? "..." : `$${totalEarned.toFixed(2)}`}
          subtext="Captured to your PayPal"
          icon={<CheckCircle2 className="w-5 h-5 text-success" />}
        />
        <StatCard
          label="Awaiting Release"
          value={loading ? "..." : `$${awaitingReleaseAmount.toFixed(2)}`}
          subtext="Held safely in PayPal escrow"
          icon={<Lock className="w-5 h-5 text-primary" />}
        />
      </div>

      {/* Active Work Directory */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-serif font-bold text-content-primary">
            My Active Contracts
          </h2>
          <Link href="/freelancer/work" className="text-xs text-primary hover:underline font-medium">
            View all contracts →
          </Link>
        </div>

        {loading ? (
          <Skeleton height={140} className="w-full" />
        ) : activeContracts.length === 0 ? (
          <EmptyState
            title="No active contracts"
            description="Find open client opportunities with guaranteed escrow budgets and initiate autonomous negotiation."
            actionLabel="Explore Opportunities"
            actionHref="/freelancer/opportunities"
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeContracts.map((job) => (
              <Card
                key={job.id}
                padding="md"
                className="flex flex-col justify-between hover:border-primary transition-all cursor-pointer"
                onClick={() => router.push(`/freelancer/work/${job.id}`)}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-content-muted">
                      Due: {job.contract?.deadline || job.deadline}
                    </span>
                    <StatusChip status={job.status} className="scale-90" />
                  </div>

                  <h3 className="font-serif font-bold text-base text-content-primary line-clamp-1">
                    {job.title}
                  </h3>
                  <p className="text-xs text-content-secondary line-clamp-2">
                    {job.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between">
                  <span className="font-serif font-bold text-base text-content-primary">
                    {job.contract?.total_amount
                      ? `$${Number(job.contract.total_amount).toFixed(2)} USD`
                      : job.public_budget_estimate || "Negotiable"}
                  </span>
                  <span className="text-xs text-primary font-medium flex items-center gap-1">
                    <span>Manage</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

