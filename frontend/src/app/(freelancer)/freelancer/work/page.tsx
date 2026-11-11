"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  ArrowRight,
  ArrowLeft,
  Check,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Layers,
  MessageSquare,
  FileText,
} from "lucide-react";
import {
  DataTable,
  StatusChip,
  Skeleton,
  EmptyState,
} from "@/components/ui";
import GlassButton from "@/components/glass/GlassButton";
import { getFreelancerApplications } from "@/lib/api";

type ContractTab = "all" | "active" | "completed" | "disputed" | "negotiating";

export default function FreelancerWorkListPage() {
  const router = useRouter();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<ContractTab>("all");

  useEffect(() => {
    const fetchWork = async () => {
      try {
        const data = await getFreelancerApplications();
        setApps(data || []);
      } catch (err) {
        console.warn("Failed to fetch freelancer work list:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWork();
  }, []);

  const getCategory = (app: any): ContractTab => {
    const s = (app.status || app.contract_status || "").toLowerCase();
    if (s === "disputed" || s === "in_dispute" || s === "arbitration") return "disputed";
    if (s === "completed" || s === "paid" || s === "released") return "completed";
    if (["funded", "in_progress", "active", "under_review", "evaluating"].includes(s)) return "active";
    if (["negotiating", "awaiting_approval", "approved", "open", "applied"].includes(s)) return "negotiating";
    return "active";
  };

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
          <span className="font-semibold text-content-primary flex items-center gap-2">
            <span>{app.job_title || "Freelance Project"}</span>
            {app.is_demo && <StatusChip status="demo_data" className="scale-75" />}
          </span>
          <span className="text-xs text-content-muted block">
            Client: <strong className="text-content-secondary font-medium">{app.client_name || "Maya Patel"}</strong> · Skills: {app.skills || "Full-Stack Development"}
          </span>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (app: any) => {
        const isCompleted = app.status === "completed" || app.contract_status === "completed";
        const isDisputed = app.status === "disputed" || app.contract_status === "disputed";
        const statusToRender = isCompleted ? "completed" : isDisputed ? "disputed" : app.status;
        return <StatusChip status={statusToRender} role="freelancer" />;
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
              ${Number(amt || 0).toFixed(2)}
            </span>
            <span className="text-[10px] text-content-muted block">USD Guaranteed</span>
          </div>
        );
      },
    },
    {
      header: "Approvals",
      align: "center" as const,
      cell: (app: any) => {
        const isCompleted = app.status === "completed" || app.contract_status === "completed";
        const clientOk = app.client_accepted || isCompleted;
        const freelancerOk = app.freelancer_accepted || isCompleted;

        return (
          <div className="flex items-center justify-center gap-2 text-xs">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                clientOk
                  ? "bg-accent/10 text-accent border-accent/20 font-semibold"
                  : "bg-surface text-content-muted border-border"
              }`}
            >
              <span>Client</span>
              {clientOk ? <Check className="w-3 h-3 stroke-[2.5]" /> : <span>-</span>}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                freelancerOk
                  ? "bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20 font-semibold"
                  : "bg-surface text-content-muted border-border"
              }`}
            >
              <span>You</span>
              {freelancerOk ? <Check className="w-3 h-3 stroke-[2.5]" /> : <span>-</span>}
            </span>
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
            <Link href={`/freelancer/work/${app.job_id}`} onClick={(e) => e.stopPropagation()}>
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
            <Link href={`/freelancer/disputes`} onClick={(e) => e.stopPropagation()}>
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

        if (app.status === "thanksgiving") {
          return (
            <Link href={`/freelancer/work/${app.job_id}/negotiate`} onClick={(e) => e.stopPropagation()}>
              <GlassButton variant="ghost" size="sm" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
                View Notice
              </GlassButton>
            </Link>
          );
        }

        if ((app.client_accepted && !app.freelancer_accepted) || app.status === "awaiting_freelancer_acceptance") {
          return (
            <Link href={`/freelancer/work/${app.job_id}/negotiate`} onClick={(e) => e.stopPropagation()}>
              <GlassButton variant="primary" size="sm" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
                Confirm Work
              </GlassButton>
            </Link>
          );
        }

        if (category === "negotiating") {
          return (
            <Link href={`/freelancer/work/${app.job_id}/negotiate`} onClick={(e) => e.stopPropagation()}>
              <GlassButton variant="secondary" size="sm" icon={<MessageSquare className="w-3.5 h-3.5" />}>
                Negotiate
              </GlassButton>
            </Link>
          );
        }

        return (
          <Link href={`/freelancer/work/${app.job_id}`} onClick={(e) => e.stopPropagation()}>
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
      <div className="space-y-6 animate-fade-in-up">
        <Skeleton className="h-8 w-48 rounded-xl" />
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
          <span>Back to Dashboard</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-content-primary tracking-tight">
          My Contracts & Deliverables
        </h1>
        <p className="text-sm text-content-secondary mt-1">
          Active agreements, deliverable submission workspaces, and verified payout milestones.
        </p>
      </div>

      <div className="content-solid p-6 shadow-soft space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
          <div>
            <h2 className="text-lg font-bold font-serif text-content-primary">
              All Applications & Workspaces
            </h2>
            <p className="text-xs text-content-secondary mt-0.5">
              Direct access to submission dropzones, arbitration review, and AI test runner logs.
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

        {displayApps.length === 0 ? (
          <EmptyState
            title={
              selectedTab === "active"
                ? "No active contracts in delivery"
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
                ? "All current work has been delivered or you are ready to take on new projects."
                : selectedTab === "completed"
                ? "Finished milestones and released payouts will appear here."
                : selectedTab === "disputed"
                ? "All agreements are proceeding smoothly without any arbitration cases."
                : "Find open client opportunities with guaranteed escrow budgets and initiate autonomous negotiation."
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
