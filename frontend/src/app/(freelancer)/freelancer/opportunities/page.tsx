"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowRight,
  DollarSign,
  Calendar,
  Lock,
  Sparkles,
  Send,
  ShieldCheck,
  CheckCircle2,
  Eye,
  Clock,
  Target,
  FileText,
  Layers,
  Shield,
  Briefcase,
  AlertCircle,
} from "lucide-react";
import {
  PageHeader,
  Card,
  DataTable,
  StatusChip,
  Button,
  EmptyState,
  Skeleton,
  Modal,
  Input,
  Textarea,
} from "@/components/ui";
import {
  getOpportunities,
  getFreelancerApplications,
  createApplication,
  getStoredUser,
  ensureDemoUser,
  Job,
  DemoUser,
} from "@/lib/api";

export default function FreelancerOpportunitiesPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // View details modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsJob, setDetailsJob] = useState<Job | null>(null);

  // Apply modal state
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [minPrice, setMinPrice] = useState<string>("800");
  const [preferredPrice, setPreferredPrice] = useState<string>("1200");
  const [timeNeededDays, setTimeNeededDays] = useState<string>("14");
  const [skills, setSkills] = useState<string>("Python, React, TypeScript, APIs");
  const [exclusions, setExclusions] = useState<string>("Excludes ongoing DevOps hosting");
  const [notes, setNotes] = useState<string>("Experienced engineer ready to build to specification with test suite.");
  const [applying, setApplying] = useState(false);

  const handlePriceChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    const cleaned = raw.replace(/^0+(?=\d)/, "");
    setter(cleaned);
  };

  const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    const cleaned = raw.replace(/^0+(?=\d)/, "");
    setTimeNeededDays(cleaned);
  };

  const fetchJobs = async () => {
    try {
      const stored = getStoredUser("freelancer");
      const userId = stored?.id || "freelancer_arjun";
      await ensureDemoUser(userId, "freelancer").catch(() => {});

      const [oppsData, appsData] = await Promise.all([
        getOpportunities(),
        getFreelancerApplications().catch(() => []),
      ]);
      const appliedSet = new Set<string>();
      (appsData || []).forEach((a: any) => {
        if (a.job_id) appliedSet.add(a.job_id);
      });
      setAppliedJobIds(appliedSet);
      // Filter out any job where this freelancer has already applied
      const unappliedOpps = (oppsData || []).filter((j: any) => !appliedSet.has(j.id));
      setJobs(unappliedOpps);
    } catch (err) {
      console.warn("Failed to fetch opportunities:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const openDetailsModal = (job: Job, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDetailsJob(job);
    setDetailsModalOpen(true);
  };

  const openApplyModal = (job: Job, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedJob(job);
    const matches = (job.public_budget_estimate || "").match(/\$?([0-9,]+(\.[0-9]+)?)/g);
    if (matches && matches.length >= 2) {
      const minVal = parseFloat(matches[0].replace(/[$,]/g, ""));
      const maxVal = parseFloat(matches[1].replace(/[$,]/g, ""));
      if (minVal > 0 && maxVal > 0) {
        setMinPrice(String(Math.round(minVal)));
        setPreferredPrice(String(Math.round(maxVal)));
      }
    } else {
      const estNum = parseFloat((job.public_budget_estimate || "").replace(/[^0-9.]/g, "") || "500");
      if (estNum > 0) {
        setMinPrice(String(Math.round(estNum * 0.7)));
        setPreferredPrice(String(Math.round(estNum)));
      }
    }
    setApplyModalOpen(true);
  };

  const handleApplyFromDetails = () => {
    if (!detailsJob) return;
    const targetJob = detailsJob;
    setDetailsModalOpen(false);
    openApplyModal(targetJob);
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    const parsedMin = parseFloat(minPrice) || 0;
    const parsedPreferred = parseFloat(preferredPrice) || 0;
    const parsedDays = parseInt(timeNeededDays, 10) || 14;

    if (parsedMin <= 0 || parsedPreferred < parsedMin) {
      alert("Please enter a valid price structure. Preferred price must be greater than or equal to minimum acceptable price.");
      return;
    }

    setApplying(true);
    try {
      await createApplication(selectedJob.id, {
        min_price: parsedMin,
        preferred_price: parsedPreferred,
        time_needed_days: parsedDays,
        skills: skills.trim(),
        exclusions,
        notes,
      });

      setApplyModalOpen(false);
      // Route directly to freelancer's work workspace or negotiation
      router.push(`/freelancer/work/${selectedJob.id}/negotiate`);
    } catch (err: any) {
      alert(`Application failed: ${err.message || err}`);
    } finally {
      setApplying(false);
    }
  };

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
      header: "Client Budget (Public)",
      align: "right" as const,
      cell: (job: Job) => (
        <span className="font-serif font-bold text-sm text-content-primary">
          {job.public_budget_estimate && job.public_budget_estimate !== "Negotiable"
            ? (job.public_budget_estimate.startsWith("$") ? `${job.public_budget_estimate} USD` : job.public_budget_estimate)
            : "Negotiable"}
        </span>
      ),
    },
    {
      header: "Target Deadline",
      align: "center" as const,
      cell: (job: Job) => (
        <span className="text-xs text-content-muted font-mono">
          {job.deadline}
        </span>
      ),
    },
    {
      header: "Priority",
      cell: (job: Job) => (
        <span className="text-xs px-2 py-0.5 rounded-full bg-surface-subtle border border-border-subtle capitalize text-content-secondary">
          {job.priorities || "Quality"}
        </span>
      ),
    },
    {
      header: "Action",
      align: "right" as const,
      cell: (job: Job) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => openDetailsModal(job, e)}
            icon={<Eye className="w-3.5 h-3.5 text-accent-blue" />}
          >
            View Details
          </Button>
          <Button
            size="sm"
            onClick={(e) => openApplyModal(job, e)}
            icon={<Send className="w-3.5 h-3.5" />}
          >
            Apply Now
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Open Freelance Opportunities"
        description="Explore client projects with verified escrow budgets. Submit your private parameters, and your AI Agent will autonomously negotiate price, timeline, and milestones on your behalf."
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
          icon={<Briefcase className="w-10 h-10 text-content-muted" />}
          title="No Open Opportunities Right Now"
          description="All published projects have already received your proposals or are in active delivery. Check 'My Work' to track your ongoing proposals, milestones, and negotiations."
          actionLabel="View My Work"
          actionHref="/freelancer/work"
        />
      ) : (
        <DataTable
          columns={columns}
          data={jobs}
          onRowClick={(job) => {
            openDetailsModal(job);
          }}
        />
      )}

      {/* View Details Modal with Spacious iOS 26 Layout */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={detailsJob?.title || "Project Specification"}
        size="2xl"
        footer={
          detailsJob && (
            <div className="flex items-center justify-between w-full">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDetailsModalOpen(false)}
              >
                Close
              </Button>
              {appliedJobIds.has(detailsJob.id) ? (
                <Link href="/freelancer/work">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={<CheckCircle2 className="w-4 h-4 text-accent-emerald" />}
                  >
                    Proposal Submitted · View in My Work
                  </Button>
                </Link>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleApplyFromDetails}
                  icon={<Send className="w-4 h-4" />}
                  className="shadow-soft hover:shadow-glow-subtle transition-all"
                >
                  Apply for this Work
                </Button>
              )}
            </div>
          )
        }
      >
        {detailsJob && (
          <div className="space-y-4">
            {/* Header badges */}
            <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-border-subtle">
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Open Opportunity</span>
              </span>
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>PayPal Safe Hold Protected</span>
              </span>
              {detailsJob.is_demo && (
                <StatusChip status="demo_data" className="scale-90" />
              )}
            </div>

            {/* Key Project Metrics: Spacious 4-Card Grid with Balanced Typography */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Card 1: Budget */}
              <div className="p-3.5 rounded-2xl bg-surface-subtle/80 border border-border-subtle hover:border-border transition-colors">
                <div className="flex items-center gap-1.5 text-xs text-content-muted mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-accent-emerald/10 text-accent-emerald flex items-center justify-center shrink-0">
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium text-xs">Client Budget</span>
                </div>
                <div className="font-serif font-bold text-sm sm:text-base text-content-primary tracking-tight leading-snug">
                  {detailsJob.public_budget_estimate && detailsJob.public_budget_estimate !== "Negotiable"
                    ? detailsJob.public_budget_estimate.replace(/\.00/g, "")
                    : "Negotiable"}
                </div>
                <div className="text-[11px] text-accent-emerald font-medium mt-1 truncate">
                  Safe hold guaranteed
                </div>
              </div>

              {/* Card 2: Deadline */}
              <div className="p-3.5 rounded-2xl bg-surface-subtle/80 border border-border-subtle hover:border-border transition-colors">
                <div className="flex items-center gap-1.5 text-xs text-content-muted mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-accent-blue/10 text-accent-blue flex items-center justify-center shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium text-xs">Target Deadline</span>
                </div>
                <div className="font-mono font-semibold text-xs sm:text-sm text-content-primary mt-1">
                  {detailsJob.deadline || "Flexible"}
                </div>
                <div className="text-[11px] text-content-muted mt-1 truncate">
                  Delivery schedule
                </div>
              </div>

              {/* Card 3: Priority */}
              <div className="p-3.5 rounded-2xl bg-surface-subtle/80 border border-border-subtle hover:border-border transition-colors">
                <div className="flex items-center gap-1.5 text-xs text-content-muted mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-accent-gold/10 text-accent-gold flex items-center justify-center shrink-0">
                    <Target className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium text-xs">Priority</span>
                </div>
                <div className="capitalize font-semibold text-xs sm:text-sm text-content-primary mt-1">
                  {detailsJob.priorities || "Quality Focus"}
                </div>
                <div className="text-[11px] text-content-muted mt-1 truncate">
                  Client directive
                </div>
              </div>

              {/* Card 4: Escrow Protection */}
              <div className="p-3.5 rounded-2xl bg-surface-subtle/80 border border-border-subtle hover:border-border transition-colors">
                <div className="flex items-center gap-1.5 text-xs text-content-muted mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-accent-emerald/10 text-accent-emerald flex items-center justify-center shrink-0">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium text-xs">Security</span>
                </div>
                <div className="font-semibold text-xs sm:text-sm text-accent-emerald mt-1">
                  100% Protected
                </div>
                <div className="text-[11px] text-content-muted mt-1 truncate">
                  Zero unpaid risk
                </div>
              </div>
            </div>

            {/* Scope / Description */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-content-primary flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent-blue" />
                <span>Project Scope & Requirements</span>
              </h4>
              <div className="p-3.5 rounded-2xl bg-surface-subtle/60 border border-border-subtle border-l-4 border-l-accent-blue text-xs sm:text-sm text-content-primary leading-relaxed whitespace-pre-wrap">
                {detailsJob.description}
              </div>
            </div>

            {/* Deliverables / Must Haves if available */}
            {(detailsJob.deliverables || detailsJob.must_haves) && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-content-primary flex items-center gap-2">
                  <Layers className="w-4 h-4 text-accent-emerald" />
                  <span>What Must Be Delivered</span>
                </h4>
                <div className="p-3.5 rounded-2xl bg-surface-subtle/60 border border-border-subtle border-l-4 border-l-accent-emerald text-xs text-content-secondary leading-relaxed whitespace-pre-wrap">
                  {detailsJob.deliverables || detailsJob.must_haves}
                </div>
              </div>
            )}

            {/* AI Agent & Privacy Guarantee Notice */}
            <div className="p-3 rounded-2xl bg-accent-blue/5 border border-accent-blue/15 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-accent-blue shrink-0 mt-0.5" />
              <div className="text-xs text-content-secondary leading-relaxed">
                <strong className="text-content-primary font-semibold">Autonomous Escrow Protection:</strong> When you apply, your AI Agent autonomously negotiates milestone payment allocations and locks funds in PayPal safe hold before you begin development.
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Apply Modal with Private Parameters */}
      <Modal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        title={`Apply to "${selectedJob?.title || "Project"}"`}
        size="2xl"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setApplyModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="apply-opportunity-form"
              size="sm"
              disabled={
                applying ||
                !minPrice ||
                !preferredPrice ||
                Number(minPrice) <= 0 ||
                Number(preferredPrice) < Number(minPrice)
              }
              icon={<Sparkles className="w-4 h-4" />}
            >
              {applying ? "Submitting Application..." : "Submit & Start Negotiation"}
            </Button>
          </div>
        }
      >
        <form id="apply-opportunity-form" onSubmit={handleApplySubmit} className="space-y-3.5">
          {/* Client Public Range Guidance (Freelancer.com style) */}
          <div className="p-3 rounded-2xl bg-accent-blue/10 border border-accent-blue/20 text-xs flex items-center justify-between gap-4">
            <div className="space-y-0.5 min-w-0">
              <span className="font-semibold text-content-primary block">
                Client's Public Budget Range
              </span>
              <span className="text-[11px] text-content-secondary block">
                We recommend targeting within or close to this bracket.
              </span>
            </div>
            <strong className="text-accent-blue font-serif font-bold text-base shrink-0 text-right">
              {selectedJob?.public_budget_estimate
                ? selectedJob.public_budget_estimate.replace(/\.00/g, "")
                : "$250 – $750 USD"}
            </strong>
          </div>

          <div className="p-3 bg-primary-subtle/30 rounded-2xl border border-primary/20 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-content-secondary leading-relaxed">
              <strong className="text-content-primary font-semibold">Privacy Guarantee:</strong> Your minimum price floor is cryptographically private. Neither the client, nor the opposing agent, nor any logs will ever see this value. Your Freelancer Agent will never agree below it.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-semibold text-content-primary flex items-center justify-between mb-1">
                <span>Minimum Acceptable Price ($ USD) *</span>
                <span className="text-[10px] text-primary font-mono uppercase tracking-wider font-bold">Private Floor</span>
              </label>
              <Input
                type="text"
                inputMode="numeric"
                leftIcon={<span className="text-content-muted font-bold text-xs select-none">$</span>}
                value={minPrice}
                onChange={handlePriceChange(setMinPrice)}
                required
                placeholder="250"
                className="font-mono text-sm"
              />
              <span className="text-[11px] text-content-muted mt-1 block">
                Agent will reject any contract below this amount.
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-content-primary flex items-center justify-between mb-1">
                <span>Preferred Target Price ($ USD) *</span>
                <span className="text-[10px] text-content-muted font-mono uppercase tracking-wider font-bold">Public Anchor</span>
              </label>
              <Input
                type="text"
                inputMode="numeric"
                leftIcon={<span className="text-content-muted font-bold text-xs select-none">$</span>}
                value={preferredPrice}
                onChange={handlePriceChange(setPreferredPrice)}
                required
                placeholder="400"
                className="font-mono text-sm"
              />
              <span className="text-[11px] text-content-muted mt-1 block">
                Initial quote submitted by your agent in round 1.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-semibold text-content-primary block mb-1">
                Estimated Working Days Needed *
              </label>
              <Input
                type="text"
                inputMode="numeric"
                leftIcon={<Clock className="w-3.5 h-3.5 text-content-muted" />}
                rightIcon={<span className="text-content-muted text-xs select-none pr-1">days</span>}
                value={timeNeededDays}
                onChange={handleDaysChange}
                required
                placeholder="14"
                className="font-mono text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-content-primary block mb-1">
                Your Relevant Skills (Comma Separated) *
              </label>
              <Input
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                required
                placeholder="e.g. Python, Docker, Next.js, APIs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-content-primary block mb-1">
              Scope Exclusions (What you will NOT do)
            </label>
            <Input
              value={exclusions}
              onChange={(e) => setExclusions(e.target.value)}
              placeholder="e.g. Excludes server provisioning, ongoing DevOps hosting"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-content-primary block mb-1">
              Brief Pitch / Technical Notes
            </label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Experienced engineer ready to build to specification with test suite."
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
