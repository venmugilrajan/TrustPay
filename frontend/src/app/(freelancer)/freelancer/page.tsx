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
  Upload,
  Lock,
  Compass,
  Scale,
  Sparkles,
  AlertTriangle,
  Layers,
  MessageSquare,
  FileText,
} from "lucide-react";
import {
  StatCard,
  StatusChip,
  Skeleton,
  EmptyState,
  DataTable,
} from "@/components/ui";
import GlassButton from "@/components/glass/GlassButton";
import WhatToDoNow from "@/components/glass/WhatToDoNow";
import {
  getFreelancerApplications,
  getStats,
  SystemStats,
} from "@/lib/api";
import { getWhatToDoNow } from "@/lib/statusLabels";

type ContractTab = "all" | "active" | "completed" | "disputed" | "negotiating";

export default function FreelancerDashboardPage() {
  const router = useRouter();
  const [apps, setApps] = useState<any[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<ContractTab>("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [appsData, statsData] = await Promise.all([
          getFreelancerApplications(),
          getStats(),
        ]);
        setApps(appsData || []);
        setStats(statsData);
      } catch (err) {
        console.warn("Failed to load freelancer dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getCategory = (app: any): ContractTab => {
    const s = (app.status || app.contract_status || "").toLowerCase();
    if (s === "disputed" || s === "in_dispute" || s === "arbitration") return "disputed";
    if (s === "completed" || s === "paid" || s === "released") return "completed";
    if (["funded", "in_progress", "active", "under_review", "evaluating"].includes(s)) return "active";
    if (["negotiating", "awaiting_approval", "approved", "open", "applied"].includes(s)) return "negotiating";
    return "active";
  };

  const isCompleted = (app: any) => getCategory(app) === "completed";

  // Categorized lists
  const activeContracts = apps.filter((a) => getCategory(a) === "active");
  const completedContracts = apps.filter((a) => getCategory(a) === "completed");
  const disputedContracts = apps.filter((a) => getCategory(a) === "disputed");
  const negotiatingApps = apps.filter((a) => getCategory(a) === "negotiating");

  // Sorted list for "all" tab: Active -> Disputed -> Negotiating -> Completed
  const sortedAllApps = [
    ...activeContracts,
    ...disputedContracts,
    ...negotiatingApps,
    ...completedContracts,
  ];

  // Current tab items
  const displayApps =
    selectedTab === "all"
      ? sortedAllApps
      : selectedTab === "active"
      ? activeContracts
      : selectedTab === "completed"
      ? completedContracts
      : selectedTab === "disputed"
      ? disputedContracts
      : negotiatingApps;

  const awaitingReleaseAmount = activeContracts.reduce(
    (sum, a) => sum + (Number(a.contract_amount) || 0),
    0
  );

  const totalEarned = stats?.total_captured_usd || 0;

  // Next action needed
  const primaryApp =
    activeContracts[0] ||
    disputedContracts[0] ||
    negotiatingApps.find((a) => a.status === "awaiting_approval") ||
    negotiatingApps[0];

  const whatToDoConfig = primaryApp
    ? getWhatToDoNow(primaryApp.status, "freelancer", {
        jobId: primaryApp.job_id,
        jobTitle: primaryApp.job_title,
        contractAmount: primaryApp.contract_amount,
        clientName: primaryApp.client_name,
        currentMilestoneTitle: "Payment Stage 1",
      })
    : {
        headline: "Ready for new contracts",
        explanation: "Explore open client opportunities with guaranteed PayPal safe holds and initiate autonomous AI negotiations.",
        actionLabel: "Explore Opportunities",
        actionHref: "/freelancer/opportunities",
      };

  const TABS: { id: ContractTab; label: string; count: number; icon: React.ReactNode; dot?: string }[] = [
    {
      id: "all",
      label: "All Contracts",
      count: apps.length,
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
      label: "Completed & Paid",
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
    ...(negotiatingApps.length > 0
      ? [
          {
            id: "negotiating" as ContractTab,
            label: "In Negotiation",
            count: negotiatingApps.length,
            icon: <MessageSquare className="w-3.5 h-3.5" />,
          },
        ]
      : []),
  ];

  const columns = [
    {
      header: "Project Title",
      cell: (app: any) => (
        <div className="space-y-1">
          <div className="font-semibold text-content-primary flex items-center gap-2">
            <span>{app.job_title}</span>
            {app.is_demo && <StatusChip status="demo_data" className="scale-90" />}
          </div>
          <p className="text-xs text-content-muted">
            Client: {app.client_name || "Maya Patel"} · Est. {app.time_needed_days || 7} days
          </p>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (app: any) => {
        return (
          <StatusChip
            status={app.status}
            role="freelancer"
          />
        );
      },
    },
    {
      header: "Agreed Payout",
      align: "right" as const,
      cell: (app: any) => {
        const amt = app.contract_amount ?? app.preferred_price;
        return (
          <div className="text-right">
            <span className="font-serif font-bold text-sm text-content-primary">
              {amt != null ? `$${Number(amt).toFixed(2)}` : "Pending"}
            </span>
            <span className="text-[10px] text-content-muted block">USD Guaranteed</span>
          </div>
        );
      },
    },
    {
      header: "Action",
      align: "right" as const,
      cell: (app: any) => {
        const category = getCategory(app);

        if (category === "active") {
          return (
            <Link href={`/freelancer/work/${app.job_id}`}>
              <GlassButton
                variant="primary"
                size="sm"
                icon={<Upload className="w-3.5 h-3.5" />}
              >
                Submit Work
              </GlassButton>
            </Link>
          );
        }

        if (category === "disputed") {
          return (
            <Link href={`/freelancer/disputes`}>
              <GlassButton
                variant="secondary"
                size="sm"
                icon={<AlertTriangle className="w-3.5 h-3.5 text-accent-danger" />}
              >
                Review Dispute
              </GlassButton>
            </Link>
          );
        }

        if (category === "negotiating") {
          return (
            <Link href={`/freelancer/work/${app.job_id}/negotiate`}>
              <GlassButton variant="secondary" size="sm" icon={<MessageSquare className="w-3.5 h-3.5" />}>
                Negotiate
              </GlassButton>
            </Link>
          );
        }

        return (
          <Link href={`/freelancer/work/${app.job_id}`}>
            <GlassButton variant="ghost" size="sm" icon={<FileText className="w-3.5 h-3.5" />}>
              View Details
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Skeleton className="h-32 rounded-2xl" />
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
            Freelancer Workspace
          </h1>
          <p className="text-sm text-content-secondary mt-1">
            Deliver verified payment stages, test submissions in the automated sandbox, and receive guaranteed PayPal payouts.
          </p>
        </div>
        <Link href="/freelancer/opportunities">
          <GlassButton
            variant="primary"
            size="md"
            icon={<Compass className="w-4 h-4" />}
          >
            Browse Available Deals
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
        secondaryInfo={primaryApp ? primaryApp.job_title : undefined}
      />

      {/* 4 Core Financial Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Active Contracts"
          value={activeContracts.length}
          subtext={
            negotiatingApps.length > 0
              ? `${negotiatingApps.length} in negotiation`
              : "Active work in progress"
          }
          icon={<Briefcase className="w-4 h-4 text-accent" />}
        />
        <StatCard
          label="Held for You"
          value={`$${Number(awaitingReleaseAmount).toFixed(2)}`}
          subtext="Locked safely in PayPal safe hold"
          icon={<Lock className="w-4 h-4 text-accent-emerald" />}
        />
        <StatCard
          label="Earned & Paid"
          value={`$${Number(totalEarned).toFixed(2)}`}
          subtext="Released directly to PayPal"
          icon={<CheckCircle2 className="w-4 h-4 text-accent-emerald" />}
        />
        <StatCard
          label="In Dispute"
          value={disputedContracts.length}
          subtext={
            disputedContracts.length > 0
              ? "Under arbitration review"
              : "Zero disputed deliverables"
          }
          icon={<Scale className={`w-4 h-4 ${disputedContracts.length > 0 ? "text-accent-danger" : "text-content-muted"}`} />}
        />
      </div>

      {/* Solid Data Table with Categorized Separation Tabs */}
      <div className="content-solid p-6 shadow-soft space-y-5">
        {/* Table Title and Total Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
          <div>
            <h2 className="text-lg font-serif font-bold text-content-primary">
              My Contracts & Applications
            </h2>
            <p className="text-xs text-content-secondary mt-0.5">
              Separated by stage: active deliveries, completed payouts, disputes, and negotiations.
            </p>
          </div>
          <span className="text-xs text-content-muted font-medium">
            {displayApps.length} of {apps.length} contracts shown
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

        {/* Table / Empty State */}
        {displayApps.length === 0 ? (
          <EmptyState
            title={
              selectedTab === "active"
                ? "No active contracts in progress"
                : selectedTab === "completed"
                ? "No completed contracts recorded yet"
                : selectedTab === "disputed"
                ? "No contracts currently in dispute"
                : selectedTab === "negotiating"
                ? "No active negotiations"
                : "No contracts found"
            }
            description={
              selectedTab === "active"
                ? "All current contracts are either completed or you are ready to apply for new client opportunities."
                : selectedTab === "completed"
                ? "Completed payment stages and released payouts will appear here."
                : selectedTab === "disputed"
                ? "All freelance contracts are proceeding smoothly with zero arbitration disputes."
                : "Explore open client opportunities with guaranteed safe-hold budgets to get started."
            }
            actionLabel="Explore Opportunities"
            onAction={() => router.push("/freelancer/opportunities")}
          />
        ) : (
          <div className="overflow-x-auto">
            <DataTable
              columns={columns}
              data={displayApps}
            />
          </div>
        )}
      </div>
    </div>
  );
}
