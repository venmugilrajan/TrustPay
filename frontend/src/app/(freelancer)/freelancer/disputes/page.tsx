"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Scale, AlertTriangle, ArrowRight } from "lucide-react";
import {
  PageHeader,
  Card,
  StatusChip,
  Button,
  EmptyState,
  Skeleton,
} from "@/components/ui";
import { getJobs, Job, Milestone, DisputeRecord } from "@/lib/api";

interface FlattenedDispute {
  dispute: DisputeRecord;
  milestone: Milestone;
  job: Job;
}

export default function FreelancerDisputesPage() {
  const [disputes, setDisputes] = useState<FlattenedDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);

  useEffect(() => {
    const fetchDisputes = async () => {
      try {
        const jobs = await getJobs();
        const list: FlattenedDispute[] = [];

        jobs.forEach((job) => {
          if (job.contract?.milestones) {
            job.contract.milestones.forEach((m) => {
              if (m.disputes && m.disputes.length > 0) {
                m.disputes.forEach((d) => {
                  list.push({ dispute: d, milestone: m, job });
                });
              }
            });
          }
        });

        setDisputes(list);
        if (list.length > 0) {
          setSelectedDisputeId(list[0].dispute.id);
        }
      } catch (err) {
        console.warn("Failed to load freelancer disputes:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDisputes();
  }, []);

  const selected = disputes.find((x) => x.dispute.id === selectedDisputeId) || disputes[0];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dispute Cases & Defenses"
        description="Monitor arbitration cases evaluated by the autonomous Dispute Agent for disputed milestone verdicts."
        backHref="/freelancer"
        backLabel="Back to Dashboard"
      />

      {loading ? (
        <div className="space-y-4">
          <Skeleton height={60} className="w-full" />
          <Skeleton height={200} className="w-full" />
        </div>
      ) : disputes.length === 0 ? (
        <EmptyState
          icon={<Scale className="w-6 h-6" />}
          title="No disputes on record"
          description="If you dispute a failed milestone verdict or if a client raises an issue, arbitration records will be tracked here."
          actionLabel="View Active Work"
          actionHref="/freelancer/work"
        />
      ) : (
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left 5 Cols: Disputes List */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-content-secondary">
              Disputed Milestones ({disputes.length})
            </h3>

            <div className="space-y-3">
              {disputes.map((item) => {
                const isSelected = item.dispute.id === selected?.dispute.id;
                return (
                  <div
                    key={item.dispute.id}
                    onClick={() => setSelectedDisputeId(item.dispute.id)}
                    className={`p-4 rounded-card border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-surface border-primary shadow-soft"
                        : "bg-surface-subtle border-border-subtle hover:bg-cream-100"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-accent uppercase text-[10px]">
                        Raised by {item.dispute.raised_by}
                      </span>
                      <StatusChip status={item.dispute.status} className="scale-90" />
                    </div>

                    <h4 className="font-serif font-bold text-sm text-content-primary mt-1">
                      {item.milestone.title}
                    </h4>
                    <p className="text-xs text-content-muted mt-0.5 line-clamp-1">
                      Project: {item.job.title}
                    </p>

                    <div className="mt-2 pt-2 border-t border-border-subtle flex items-center justify-between text-xs">
                      <span className="font-serif font-bold text-content-primary">
                        ${Number(item.milestone?.amount || 0).toFixed(2)} USD
                      </span>
                      <span className="text-content-secondary font-medium">
                        Ruling: {item.dispute.ruling || "Under Review"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 7 Cols: Dispute Detail & Final Ruling */}
          {selected && (
            <div className="lg:col-span-7 space-y-6">
              <Card padding="lg" className="space-y-6 bg-surface shadow-soft border-border-strong">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                      Arbitration Case #{selected.dispute.id.slice(0, 8)}
                    </span>
                    <h3 className="text-xl font-serif font-bold text-content-primary mt-1">
                      {selected.milestone.title}
                    </h3>
                    <p className="text-xs text-content-secondary mt-0.5">
                      Contract: {selected.job.title}
                    </p>
                  </div>
                  <StatusChip status={selected.dispute.status} />
                </div>

                {/* Dispute Argument / Reason */}
                <div className="space-y-2 bg-cream-100 p-4 rounded-btn border border-border-subtle">
                  <span className="text-xs font-semibold uppercase tracking-wider text-content-secondary block">
                    Statement from {selected.dispute.raised_by.toUpperCase()}:
                  </span>
                  <p className="text-xs text-content-primary leading-relaxed italic">
                    &quot;{selected.dispute.reason}&quot;
                  </p>
                </div>

                {/* Final Ruling Card */}
                {selected.dispute.ruling ? (
                  <div className="space-y-4 p-5 rounded-card bg-surface-subtle border border-primary/30">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        Arbitration Ruling
                      </span>
                      <span className="px-2.5 py-1 text-xs font-serif font-bold rounded bg-primary text-primary-foreground">
                        {selected.dispute.ruling.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-border-subtle">
                      <div>
                        <span className="text-content-muted block">Released to Your Account:</span>
                        <span className="text-base font-serif font-bold text-success">
                          ${Number(selected.dispute?.amount_to_capture || 0).toFixed(2)} USD
                        </span>
                      </div>
                      <div>
                        <span className="text-content-muted block">Returned to Client:</span>
                        <span className="text-base font-serif font-bold text-accent">
                          ${Number(selected.dispute?.amount_to_refund || 0).toFixed(2)} USD
                        </span>
                      </div>
                    </div>

                    {selected.dispute.reasoning && (
                      <div className="pt-2 text-xs text-content-secondary leading-relaxed">
                        <strong className="text-content-primary">Dispute Agent Rationale: </strong>
                        {selected.dispute.reasoning}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-btn bg-warning-bg border border-warning-border text-xs text-warning">
                    Arbitration in progress. The Dispute Agent is evaluating code deliverables and acceptance criteria evidence.
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <Link href={`/freelancer/work/${selected.job.id}`}>
                    <Button variant="outline" size="sm">
                      <span>View Milestone Deliverable</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

