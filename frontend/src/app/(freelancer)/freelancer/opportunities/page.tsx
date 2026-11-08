"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, DollarSign, Calendar, MessageSquare } from "lucide-react";
import {
  PageHeader,
  Card,
  DataTable,
  StatusChip,
  Button,
  EmptyState,
  Skeleton,
} from "@/components/ui";
import { getJobs, Job } from "@/lib/api";

export default function FreelancerOpportunitiesPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const data = await getJobs();
        setJobs(data);
      } catch (err) {
        console.warn("Failed to fetch opportunities:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const columns = [
    {
      header: "Project Title",
      cell: (job: Job) => (
        <div className="space-y-0.5">
          <span className="font-semibold text-content-primary flex items-center gap-2">
            <span>{job.title}</span>
            {job.is_demo && <StatusChip status="demo_data" className="scale-90" />}
          </span>
          <p className="text-xs text-content-secondary line-clamp-1 max-w-sm">
            {job.description}
          </p>
        </div>
      ),
    },
    {
      header: "Budget (Max Escrow)",
      align: "right" as const,
      cell: (job: Job) => (
        <span className="font-serif font-bold text-sm text-content-primary">
          ${(job.contract?.total_amount || job.max_budget).toFixed(2)} USD
        </span>
      ),
    },
    {
      header: "Target Deadline",
      align: "center" as const,
      cell: (job: Job) => (
        <span className="text-xs text-content-muted font-mono">
          {job.contract?.deadline || job.deadline}
        </span>
      ),
    },
    {
      header: "State",
      cell: (job: Job) => <StatusChip status={job.status} />,
    },
    {
      header: "Action",
      align: "right" as const,
      cell: (job: Job) => (
        <Link
          href={
            job.status === "negotiating"
              ? `/freelancer/work/${job.id}/negotiate`
              : `/freelancer/work/${job.id}`
          }
          onClick={(e) => e.stopPropagation()}
        >
          <Button variant="outline" size="sm">
            <span>View & Negotiate</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Open Freelance Opportunities"
        description="Explore client projects with verified escrow budgets. Let your Freelancer Agent negotiate fair milestone payments on your behalf."
        backHref="/freelancer"
        backLabel="Back to Dashboard"
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton height={48} className="w-full" />
          <Skeleton height={64} className="w-full" />
          <Skeleton height={64} className="w-full" />
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={<Search className="w-6 h-6" />}
          title="No open opportunities at this moment"
          description="Check back shortly or visit the Demo Hub to seed a demonstration project."
          actionLabel="Open Demo Hub"
          actionHref="/demo"
        />
      ) : (
        <DataTable
          columns={columns}
          data={jobs}
          onRowClick={(job) => router.push(`/freelancer/work/${job.id}`)}
        />
      )}
    </div>
  );
}

