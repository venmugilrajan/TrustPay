"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  Lock,
  CheckCircle2,
  ArrowRight,
  Briefcase,
  Layers,
  MessageSquare,
  DollarSign,
  Sparkles,
  AlertTriangle,
  FileText,
} from "lucide-react";
import {
  StatCard,
  DataTable,
  StatusChip,
  Skeleton,
  EmptyState,
} from "@/components/ui";
import GlassButton from "@/components/glass/GlassButton";
import GlassCard from "@/components/glass/GlassCard";
import WhatToDoNow from "@/components/glass/WhatToDoNow";
import InfoPopover from "@/components/glass/InfoPopover";
import { getJobs, getStats, getStoredUser, ensureDemoUser, Job, SystemStats } from "@/lib/api";
import { getWhatToDoNow } from "@/lib/statusLabels";

type ClientTab = "all" | "active" | "completed" | "disputed" | "negotiating";

export default function ClientDashboardPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<ClientTab>("all");

  const loadData = async () => {
    try {
      const stored = getStoredUser("client");
      const userId = stored?.id || "client_maya";
      await ensureDemoUser(userId, "client").catch(() => {});

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

  // Filter jobs
  const isJobCompleted = (j: Job) =>
    j.status === "completed" ||
    Boolean(
      j.contract?.milestones?.length &&
        j.contract.milestones.every((m) => m.status === "passed" || m.status === "paid")
    );

  const getCategory = (j: Job): ClientTab => {
    const s = (j.status || "").toLowerCase();
    if (s === "disputed" || s === "in_dispute") return "disputed";
    if (isJobCompleted(j)) return "completed";
    if (["funded", "in_progress", "active"].includes(s)) return "active";
    if (["negotiating", "awaiting_approval", "approved", "funding", "open"].includes(s)) return "negotiating";
    return "active";
  };

  // Categorized lists
  const activeContracts = jobs.filter((j) => getCategory(j) === "active");
  const completedContracts = jobs.filter((j) => getCategory(j) === "completed");
  const disputedContracts = jobs.filter((j) => getCategory(j) === "disputed");
  const negotiatingContracts = jobs.filter((j) => getCategory(j) === "negotiating");

  // Sorted list for "all" tab: Active -> Disputed -> Negotiating -> Completed
  const sortedAllJobs = [
    ...activeContracts,
    ...disputedContracts,
    ...negotiatingContracts,
    ...completedContracts,
  ];

  const displayJobs =
    selectedTab === "all"
      ? sortedAllJobs
      : selectedTab === "active"
      ? activeContracts
      : selectedTab === "completed"
      ? completedContracts
      : selectedTab === "disputed"
      ? disputedContracts
      : negotiatingContracts;

  // Escrow math: funds held safely in PayPal
  const fundsHeldSafely = stats?.funds_held_escrow_usd != null && stats.funds_held_escrow_usd > 0
    ? stats.funds_held_escrow_usd
    : activeContracts.reduce((sum, j) => sum + (j.contract?.total_amount || 0), 0);

  const releasedFunds = stats?.total_captured_usd || 0;

  // Determine top priority action for "What to do now" card
  const urgentJob =
    jobs.find((j) => j.status === "awaiting_approval") ||
    jobs.find((j) => j.status === "approved") ||
    activeContracts[0] ||
    negotiatingContracts[0];

  const whatToDoConfig = urgentJob
    ? getWhatToDoNow(urgentJob.status, "client", {
        jobId: urgentJob.id,
        jobTitle: urgentJob.title,
        contractAmount: urgentJob.contract?.total_amount,
        freelancerName: (urgentJob as any).assigned_freelancer_name,
        currentMilestoneTitle: urgentJob.contract?.milestones?.[0]?.title,
      })
    : {
        headline: "Welcome to your Client Workspace",
        explanation: "Post your first project or inspect candidate proposals to begin autonomous escrow protected contracts.",
        actionLabel: "Post a Project",
        actionHref: "/client/jobs/new",
      };

  const getActionForJob = (job: Job) => {
    if (isJobCompleted(job)) {
      return { label: "View Details", href: `/client/jobs/${job.id}` };
    }

    switch (job.status) {
      case "open":
        return { label: "Manage Listing", href: `/client/jobs/${job.id}` };
      case "negotiating":
        return { label: "View Negotiation", href: `/client/jobs/${job.id}/negotiate` };
      case "awaiting_approval":
        return { label: "Review & Approve", href: `/client/jobs/${job.id}` };
      case "approved":
        return { label: "Fund Safe Hold", href: `/client/jobs/${job.id}/fund` };
      case "funded":
      case "in_progress":
        return { label: "View Payment Stages", href: `/client/jobs/${job.id}` };
      case "disputed":
        return { label: "Review Dispute", href: `/client/disputes` };
      default:
        return { label: "View Details", href: `/client/jobs/${job.id}` };
    }
  };

  const TABS: { id: ClientTab; label: string; count: number; icon: React.ReactNode; dot?: string }[] = [
    {
      id: "all",
      label: "All Projects",
      count: jobs.length,
      icon: <Layers className="w-3.5 h-3.5" />,
    },
    {
      id: "active",
      label: "Active Delivery",
      count: activeContracts.length,
      icon: <Briefcase className="w-3.5 h-3.5" />,
      dot: "bg-accent-emerald",
    },
    {
      id: "completed",
      label: "Completed & Released",
      count: completedContracts.length,
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    {
      id: "disputed",
      label: "In Dispute",
      count: disputedContracts.length,
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      dot: disputedContracts.length > 0 ? "bg-accent-danger" : undefined,
    },
    ...(negotiatingContracts.length > 0
      ? [
          {
            id: "negotiating" as ClientTab,
            label: "In Negotiation",
            count: negotiatingContracts.length,
            icon: <MessageSquare className="w-3.5 h-3.5" />,
          },
        ]
      : []),
  ];

  const columns = [
    {
      header: "Project Title",
      cell: (job: Job) => (
        <div className="space-y-1">
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
      cell: (job: any) => {
        const isHired = ["approved", "funded", "in_progress", "completed", "disputed"].includes(job.status);
        if (!isHired || !job.assigned_freelancer_name || job.assigned_freelancer_name === "None hired yet") {
          return (
            <span className="text-xs text-content-muted italic">
              {job.applications_count && job.applications_count > 0
                ? `${job.applications_count} applicant${job.applications_count > 1 ? "s" : ""} (none hired)`
                : "No applicants yet"}
            </span>
          );
        }
        return (
          <span className="text-xs font-medium text-content-secondary">
            {job.assigned_freelancer_name}
          </span>
        );
      },
    },
    {
      header: "Status",
      cell: (job: Job) => (
        <StatusChip
          status={isJobCompleted(job) ? "completed" : job.status}
          role="client"
        />
      ),
    },
    {
      header: "Safe Hold Value",
      align: "right" as const,
      cell: (job: Job) => {
        const val = job.contract?.total_amount != null
          ? job.contract.total_amount
          : job.max_budget;
        return (
          <div className="text-right">
            <span className="font-serif font-bold text-sm text-content-primary">
              {val != null ? `$${Number(val).toFixed(2)}` : "Negotiating"}
            </span>
            <span className="text-[10px] text-content-muted block">USD</span>
          </div>
        );
      },
    },
    {
      header: "Next Step",
      align: "right" as const,
      cell: (job: Job) => {
        const action = getActionForJob(job);
        const isUrgent = job.status === "awaiting_approval" || job.status === "approved";
        return (
          <Link href={action.href}>
            <GlassButton
              variant={isUrgent ? "primary" : "secondary"}
              size="sm"
              icon={isUrgent ? <Sparkles className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5 ml-1 order-last" />}
            >
              {action.label}
            </GlassButton>
          </Link>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
      {/* Top Banner / Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-content-primary tracking-tight">
            Client Hiring Workspace
          </h1>
          <p className="text-sm text-content-secondary mt-1">
            Monitor active safe holds, approve autonomous contract stages, and review verified deliverables.
          </p>
        </div>
        <Link href="/client/jobs/new">
          <GlassButton
            variant="primary"
            size="md"
            icon={<PlusCircle className="w-4 h-4" />}
          >
            Post a New Project
          </GlassButton>
        </Link>
      </div>

      {/* Prominent "What to do now" Guidance */}
      <WhatToDoNow
        headline={whatToDoConfig.headline}
        explanation={whatToDoConfig.explanation}
        actionLabel={whatToDoConfig.actionLabel}
        actionHref={whatToDoConfig.actionHref}
        isUrgent={whatToDoConfig.isUrgent}
        secondaryInfo={urgentJob ? urgentJob.title : undefined}
      />

      {/* 3 Core Financial Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          label="Active Projects"
          value={activeContracts.length}
          subtext={
            negotiatingContracts.length > 0
              ? `${negotiatingContracts.length} in negotiation`
              : "All terms confirmed"
          }
          icon={<Briefcase className="w-4 h-4 text-accent" />}
        />
        <StatCard
          label="Money Held Safely"
          value={`$${Number(fundsHeldSafely).toFixed(2)}`}
          subtext="Protected by PayPal authorization"
          icon={<Lock className="w-4 h-4 text-accent-emerald" />}
        />
        <StatCard
          label="Released to Freelancers"
          value={`$${Number(releasedFunds).toFixed(2)}`}
          subtext="Payouts released upon passing tests"
          icon={<CheckCircle2 className="w-4 h-4 text-accent-emerald" />}
        />
      </div>

      {/* Negotiation alert section if active negotiations exist */}
      {negotiatingContracts.length > 0 && (
        <div className="glass-subtle p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-info/15 text-info flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-content-primary">
                {negotiatingContracts.length} Autonomous Negotiations Active
              </div>
              <div className="text-xs text-content-secondary">
                Your AI agent is actively establishing mutual terms and milestone specs.
              </div>
            </div>
          </div>
          <Link href={`/client/jobs/${negotiatingContracts[0].id}/negotiate`}>
            <GlassButton variant="secondary" size="sm">
              View Dialogue
            </GlassButton>
          </Link>
        </div>
      )}

      {/* Solid Data Table with Categorized Separation Tabs */}
      <div className="content-solid p-6 shadow-soft space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
          <div>
            <h2 className="text-lg font-serif font-bold text-content-primary">
              All Client Projects
            </h2>
            <p className="text-xs text-content-secondary mt-0.5">
              Separated by stage: active delivery, completed payouts, disputes, and negotiations.
            </p>
          </div>
          <span className="text-xs text-content-muted font-medium">
            {displayJobs.length} of {jobs.length} projects shown
          </span>
        </div>

        {/* Category Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-surface-subtle border border-border-subtle">
          {TABS.map((tab) => {
            const isSelected = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-content-secondary hover:text-content-primary hover:bg-surface/80"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.dot && (
                  <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`} />
                )}
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-surface text-content-muted border border-border-subtle"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {displayJobs.length === 0 ? (
          <EmptyState
            title={
              selectedTab === "active"
                ? "No active projects in progress"
                : selectedTab === "completed"
                ? "No completed projects recorded yet"
                : selectedTab === "disputed"
                ? "No projects currently in dispute"
                : selectedTab === "negotiating"
                ? "No active negotiations"
                : "No projects posted yet"
            }
            description={
              selectedTab === "active"
                ? "All projects are currently completed or in negotiation."
                : selectedTab === "completed"
                ? "Projects with passed deliverables and released payouts will appear here."
                : selectedTab === "disputed"
                ? "All projects are proceeding smoothly with zero arbitration disputes."
                : "Create your first project to let AI agents negotiate terms and set up safe hold protections."
            }
            actionLabel="Post a Project"
            onAction={() => router.push("/client/jobs/new")}
          />
        ) : (
          <div className="overflow-x-auto">
            <DataTable
              columns={columns}
              data={displayJobs}
            />
          </div>
        )}
      </div>
    </div>
  );
}
