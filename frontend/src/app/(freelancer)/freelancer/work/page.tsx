"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, ArrowRight, CheckCircle2 } from "lucide-react";
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

export default function FreelancerWorkListPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWork = async () => {
      try {
        const data = await getJobs();
        setJobs(data);
      } catch (err) {
        console.warn("Failed to fetch freelancer work list:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWork();
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
          <p className="text-xs text-content-muted line-clamp-1 max-w-sm">
            {job.description}
          </p>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (job: Job) => <StatusChip status={job.status} />,
    },
    {
      header: "Contract Amount",
      align: "right" as const,
      cell: (job: Job) => (
        <span className="font-serif font-bold text-sm text-content-primary">
          ${Number(job.contract?.total_amount || job.max_budget || 0).toFixed(2)} USD
        </span>
      ),
    },
    {
      header: "Due Date",
      align: "center" as const,
      cell: (job: Job) => (
        <span className="text-xs text-content-muted font-mono">
          {job.contract?.deadline || job.deadline}
        </span>
      ),
    },
    {
      header: "Workspace",
      align: "right" as const,
      cell: (job: Job) => (
        <Link href={`/freelancer/work/${job.id}`} onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm">
            <span>Open Contract</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Freelance Contracts"
        description="Active agreements, deliverable milestones, and payment release timelines."
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
          icon={<Briefcase className="w-6 h-6" />}
          title="No contracts found"
          description="You do not have any active freelance projects. Browse opportunities to get started."
          actionLabel="Find Opportunities"
          actionHref="/freelancer/opportunities"
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

