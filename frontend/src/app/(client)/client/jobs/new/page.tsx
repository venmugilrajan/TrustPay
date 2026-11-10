"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  FileText,
  DollarSign,
  Lock,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import {
  Input,
  Textarea,
  Select,
} from "@/components/ui";
import GlassButton from "@/components/glass/GlassButton";
import GlassCard from "@/components/glass/GlassCard";
import WhatToDoNow from "@/components/glass/WhatToDoNow";
import { createJob, stepNegotiation } from "@/lib/api";

const PRESETS = [
  {
    label: "Custom Project (Start from scratch)",
    value: "custom",
    title: "",
    description: "",
    budget: 750,
    deadline: "2026-12-15",
  },
  {
    label: "Preset: Zero-Knowledge Rollup Settlement Contract ($1,500)",
    value: "zk-rollup",
    title: "Zero-Knowledge Rollup Settlement Contract",
    description: "Implement an EVM smart contract and verification circuits for optimistic rollup state transitions and proof validation.",
    budget: 1500,
    deadline: "2026-12-10",
  },
  {
    label: "Preset: FastAPI Distributed Rate Limiter ($950)",
    value: "rate-limiter",
    title: "FastAPI Distributed Rate Limiter",
    description: "Build an asynchronous Redis token-bucket rate limiter with IP and token sliding-window policies, 100% test coverage.",
    budget: 950,
    deadline: "2026-11-28",
  },
  {
    label: "Preset: PayPal Orders v2 Checkout Integration ($1,200)",
    value: "paypal-checkout",
    title: "PayPal Orders v2 Checkout Integration",
    description: "Construct Next.js 14 and FastAPI checkout flow with server-side authorization and webhook idempotency handling.",
    budget: 1200,
    deadline: "2026-12-05",
  },
];

interface BudgetTier {
  id: string;
  name: string;
  rangeText: string;
  min: number;
  max: number;
  description: string;
  badge?: string;
}

const BUDGET_TIERS: BudgetTier[] = [
  {
    id: "micro",
    name: "Micro Project",
    rangeText: "$50.00 – $150.00 USD",
    min: 50,
    max: 150,
    description: "Small bug fix, quick script, UI tweak, single component",
    badge: "Quick Win",
  },
  {
    id: "basic",
    name: "Basic Project",
    rangeText: "$150.00 – $400.00 USD",
    min: 150,
    max: 400,
    description: "API endpoint, webhook handler, auth flow, form integration",
    badge: "Popular",
  },
  {
    id: "medium",
    name: "Medium Project",
    rangeText: "$250.00 – $750.00 USD",
    min: 250,
    max: 750,
    description: "Multi-step flow, data processing pipelines, full features",
    badge: "Standard",
  },
  {
    id: "large",
    name: "Large Project",
    rangeText: "$750.00 – $1,500.00 USD",
    min: 750,
    max: 1500,
    description: "Complete backend subsystem, distributed queue, test suite",
    badge: "Architecture",
  },
  {
    id: "major",
    name: "Major Architecture",
    rangeText: "$1,500.00 – $3,000.00 USD",
    min: 1500,
    max: 3000,
    description: "End-to-end full stack platform with automated sandbox tests",
    badge: "Enterprise",
  },
  {
    id: "custom",
    name: "Custom Range",
    rangeText: "Custom Min – Max",
    min: 250,
    max: 1200,
    description: "Manually specify your public budget range and private cap",
    badge: "Custom",
  },
];

export default function PostJobWizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedPreset, setSelectedPreset] = useState("custom");

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("750");
  const [deadline, setDeadline] = useState("2026-12-05");

  // Freelancer.com style budget range tier state
  const [selectedTierId, setSelectedTierId] = useState<string>("medium");
  const [publicEstimate, setPublicEstimate] = useState<string>("$250.00 – $750.00 USD");
  const [customMin, setCustomMin] = useState<string>("250");
  const [customMax, setCustomMax] = useState<string>("750");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTierSelect = (tier: BudgetTier) => {
    setSelectedTierId(tier.id);
    if (tier.id !== "custom") {
      setPublicEstimate(tier.rangeText);
      setBudget(tier.max.toString());
    } else {
      const minNum = parseFloat(customMin) || 100;
      const maxNum = parseFloat(customMax) || 1000;
      setPublicEstimate(`$${minNum.toFixed(2)} – $${maxNum.toFixed(2)} USD`);
      setBudget(maxNum.toString());
    }
  };

  const handleCustomRangeChange = (newMin: string, newMax: string) => {
    setCustomMin(newMin);
    setCustomMax(newMax);
    const minNum = parseFloat(newMin) || 0;
    const maxNum = parseFloat(newMax) || 0;
    setPublicEstimate(`$${minNum.toFixed(2)} – $${maxNum.toFixed(2)} USD`);
    setBudget(newMax);
  };

  const handlePresetChange = (presetValue: string) => {
    setSelectedPreset(presetValue);
    const p = PRESETS.find((x) => x.value === presetValue);
    if (p && p.value !== "custom") {
      setTitle(p.title);
      setDescription(p.description);
      setBudget(p.budget.toString());
      setDeadline(p.deadline);
      if (p.budget <= 150) {
        setSelectedTierId("micro");
        setPublicEstimate("$50.00 – $150.00 USD");
      } else if (p.budget <= 400) {
        setSelectedTierId("basic");
        setPublicEstimate("$150.00 – $400.00 USD");
      } else if (p.budget <= 750) {
        setSelectedTierId("medium");
        setPublicEstimate("$250.00 – $750.00 USD");
      } else if (p.budget <= 1500) {
        setSelectedTierId("large");
        setPublicEstimate("$750.00 – $1,500.00 USD");
      } else {
        setSelectedTierId("major");
        setPublicEstimate("$1,500.00 – $3,000.00 USD");
      }
    }
  };

  const handleNext = () => {
    setError(null);
    if (currentStep === 1) {
      if (!title.trim() || title.trim().length < 2) {
        setError("Please provide a project title (minimum 2 characters).");
        return;
      }
      if (!description.trim() || description.trim().length < 10) {
        setError("Please provide a scope description (minimum 10 characters).");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const budgetNum = parseFloat(budget);
      if (isNaN(budgetNum) || budgetNum <= 0) {
        setError("Please enter a valid positive budget amount in USD.");
        return;
      }
      if (!deadline.trim()) {
        setError("Please specify a target completion deadline.");
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    setError(null);
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const jobData = {
        title: title.trim(),
        description: description.trim(),
        max_budget: parseFloat(budget),
        public_budget_estimate: publicEstimate,
        deadline: deadline.trim(),
        deliverables: "Verified clean code deliverables meeting 100% test criteria",
        priorities: "quality",
      };

      const result = await createJob(jobData);
      const createdJobId = result.id;

      try {
        await stepNegotiation(createdJobId);
      } catch (negErr) {
        console.warn("Initial negotiation turn kickstart:", negErr);
      }

      router.push(`/client/jobs/${createdJobId}`);
    } catch (err: any) {
      setError(err.message || "Failed to post job. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div>
        <Link
          href="/client"
          className="inline-flex items-center gap-1.5 text-xs text-content-muted hover:text-content-primary transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-content-primary tracking-tight">
          Post a New Project
        </h1>
        <p className="text-sm text-content-secondary mt-1">
          Set up deliverables and your private budget ceiling. Autonomous AI agents will negotiate fair payment stages.
        </p>
      </div>

      {/* Guided 3-Step Pill Bar */}
      <div className="glass-subtle p-3 flex items-center justify-between gap-2 max-w-xl">
        {[
          { num: 1, label: "1. Describe Project" },
          { num: 2, label: "2. Budget & Deadline" },
          { num: 3, label: "3. Review & Launch" },
        ].map((s) => (
          <button
            key={s.num}
            type="button"
            onClick={() => s.num < currentStep && setCurrentStep(s.num)}
            className={`flex-1 py-2 px-3 rounded-full text-xs font-semibold transition-all text-center ${
              currentStep === s.num
                ? "nav-pill-active shadow-subtle"
                : currentStep > s.num
                ? "text-accent-emerald bg-accent-emerald/10 cursor-pointer"
                : "text-content-muted bg-transparent cursor-default"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-danger/10 border border-danger/25 text-xs text-danger font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Multi-Step Form */}
        <div className="lg:col-span-8">
          {/* STEP 1: DESCRIBE PROJECT */}
          {currentStep === 1 && (
            <div className="content-solid p-6 sm:p-8 space-y-6 shadow-soft">
              <div>
                <h2 className="text-lg font-serif font-bold text-content-primary">
                  Step 1: Project Scope & Deliverables
                </h2>
                <p className="text-xs text-content-secondary mt-1">
                  Specify what you need delivered. Choose a sample preset to auto-fill proven technical requirements.
                </p>
              </div>

              <div className="space-y-4">
                <Select
                  label="Quick Start with a Project Template"
                  options={PRESETS.map((p) => ({ label: p.label, value: p.value }))}
                  value={selectedPreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  helperText="Load pre-configured scopes with proven sandbox test criteria."
                />

                <Input
                  label="Project Title"
                  placeholder="e.g., PostgreSQL Database Optimization"
                  helperText="Give your project a short, clear summary title."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />

                <Textarea
                  label="Scope & Deliverable Requirements"
                  placeholder="Describe what needs to be built, preferred tech stack, key test criteria, and deliverables..."
                  helperText="Be as specific as possible. The AI Agents use this to derive testable acceptance criteria."
                  rows={8}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="pt-4 flex justify-end border-t border-border">
                <GlassButton
                  variant="primary"
                  size="md"
                  onClick={handleNext}
                  icon={<ArrowRight className="w-4 h-4 ml-1.5 order-last" />}
                >
                  Continue to Budget & Timeline
                </GlassButton>
              </div>
            </div>
          )}

          {/* STEP 2: BUDGET & DEADLINE */}
          {currentStep === 2 && (
            <div className="content-solid p-6 sm:p-8 space-y-6 shadow-soft">
              <div>
                <h2 className="text-lg font-serif font-bold text-content-primary">
                  Step 2: Estimated Budget & Target Deadline
                </h2>
                <p className="text-xs text-content-secondary mt-1">
                  Select an estimated budget range (shown publicly to freelancers like Freelancer.com) and set your private ceiling.
                </p>
              </div>

              {/* Freelancer.com Style Budget Tiers */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-content-primary block">
                  What is your estimated budget? (Publicly visible to freelancers)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {BUDGET_TIERS.map((tier) => {
                    const isSelected = selectedTierId === tier.id;
                    return (
                      <div
                        key={tier.id}
                        onClick={() => handleTierSelect(tier)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "bg-accent-blue/10 border-accent-blue shadow-subtle ring-1 ring-accent-blue/30"
                            : "bg-surface-subtle/70 border-border-subtle hover:border-border hover:bg-surface-subtle"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="font-semibold text-xs text-content-primary">
                              {tier.name}
                            </span>
                            {tier.badge && (
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                                  isSelected
                                    ? "bg-accent-blue text-white"
                                    : "bg-surface border border-border text-content-muted"
                                }`}
                              >
                                {tier.badge}
                              </span>
                            )}
                          </div>
                          <div className="font-serif font-bold text-sm text-content-primary mb-1">
                            {tier.rangeText}
                          </div>
                          <p className="text-[11px] text-content-secondary line-clamp-2 leading-relaxed">
                            {tier.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Range Inputs (if Custom Range selected) */}
              {selectedTierId === "custom" && (
                <div className="p-4 rounded-2xl bg-surface-subtle/80 border border-border-subtle grid sm:grid-cols-2 gap-4">
                  <Input
                    label="Minimum Estimate ($ USD)"
                    type="number"
                    value={customMin}
                    onChange={(e) => handleCustomRangeChange(e.target.value, customMax)}
                    helperText="Lower bound shown to candidates"
                  />
                  <Input
                    label="Maximum Estimate ($ USD)"
                    type="number"
                    value={customMax}
                    onChange={(e) => handleCustomRangeChange(customMin, e.target.value)}
                    helperText="Upper bound of public range"
                  />
                </div>
              )}

              {/* Private Ceiling & Target Deadline */}
              <div className="grid sm:grid-cols-2 gap-6 pt-2">
                <Input
                  label="Private Maximum Budget Ceiling (USD)"
                  type="number"
                  leftIcon={<span className="text-sm font-serif font-bold">$</span>}
                  helperText="Absolute cap: Your AI Agent will never agree to a contract above this amount."
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />

                <Input
                  label="Target Completion Deadline"
                  type="date"
                  helperText="Expected completion date for final deliverable verification."
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>

              {/* Live Preview & Privacy Guarantee Callout */}
              <div className="p-4 rounded-2xl glass-subtle border border-border text-xs space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border-subtle">
                  <div className="flex items-center gap-1.5 font-semibold text-content-primary">
                    <span className="w-2 h-2 rounded-full bg-accent-blue" />
                    <span>Public Range (Freelancers See):</span>
                    <strong className="text-accent-blue font-serif font-bold">{publicEstimate}</strong>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-content-primary">
                    <Lock className="w-3.5 h-3.5 text-accent-emerald" />
                    <span>Private Ceiling:</span>
                    <strong className="text-accent-emerald font-serif font-bold">${parseFloat(budget || "0").toFixed(2)} USD</strong>
                  </div>
                </div>
                <p className="text-content-secondary leading-relaxed pt-1">
                  Freelancers only see the public range to determine if their rates match. Your exact ceiling is strictly confidential to your Client AI Agent to prevent lowballing or price anchoring.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-border">
                <GlassButton variant="secondary" size="md" onClick={handleBack} icon={<ArrowLeft className="w-4 h-4" />}>
                  Back
                </GlassButton>
                <GlassButton
                  variant="primary"
                  size="md"
                  onClick={handleNext}
                  icon={<ArrowRight className="w-4 h-4 ml-1.5 order-last" />}
                >
                  Review & Finalize
                </GlassButton>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & LAUNCH */}
          {currentStep === 3 && (
            <div className="content-solid p-6 sm:p-8 space-y-6 shadow-soft">
              <div>
                <h2 className="text-lg font-serif font-bold text-content-primary">
                  Step 3: Review & Initiate AI Negotiation
                </h2>
                <p className="text-xs text-content-secondary mt-1">
                  Review your project details before dispatching the autonomous negotiation agents.
                </p>
              </div>

              <div className="space-y-4 glass-subtle p-5 rounded-2xl border border-border text-xs">
                <div>
                  <span className="text-content-muted uppercase tracking-wider text-[10px] block font-semibold">
                    Project Title
                  </span>
                  <span className="text-base font-bold text-content-primary font-serif">
                    {title}
                  </span>
                </div>

                <div>
                  <span className="text-content-muted uppercase tracking-wider text-[10px] block font-semibold">
                    Scope & Technical Deliverables
                  </span>
                  <p className="text-content-secondary leading-relaxed mt-1 whitespace-pre-wrap">
                    {description}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-border">
                  <div>
                    <span className="text-content-muted uppercase tracking-wider text-[10px] block font-semibold">
                      Public Estimated Range
                    </span>
                    <span className="text-sm font-bold font-serif text-accent-blue mt-0.5 block">
                      {publicEstimate}
                    </span>
                  </div>
                  <div>
                    <span className="text-content-muted uppercase tracking-wider text-[10px] block font-semibold">
                      Private Budget Ceiling
                    </span>
                    <span className="text-base font-bold font-serif text-accent-emerald mt-0.5 block">
                      ${parseFloat(budget || "0").toFixed(2)} USD
                    </span>
                  </div>
                  <div>
                    <span className="text-content-muted uppercase tracking-wider text-[10px] block font-semibold">
                      Target Deadline
                    </span>
                    <span className="text-sm font-semibold text-content-primary font-mono mt-0.5 block">
                      {deadline}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-accent/10 text-content-primary border border-accent/20 text-xs space-y-1.5">
                <p className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span>Autonomous Negotiation Sequence</span>
                </p>
                <p className="text-content-secondary leading-relaxed">
                  Upon clicking Publish, your Client Agent and the Freelancer Agent will negotiate payment stages and strict sandbox test criteria in alternating rounds. Funds remain safely in your account until you approve the negotiated draft.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-border">
                <GlassButton
                  variant="secondary"
                  size="md"
                  onClick={handleBack}
                  disabled={submitting}
                  icon={<ArrowLeft className="w-4 h-4" />}
                >
                  Back
                </GlassButton>
                <GlassButton
                  variant="primary"
                  size="md"
                  onClick={handleSubmit}
                  loading={submitting}
                  icon={<Sparkles className="w-4 h-4" />}
                >
                  Publish Project Posting
                </GlassButton>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Deal Preview Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <div className="content-solid p-6 shadow-soft space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                Deal Preview
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20 text-[11px] font-semibold">
                Draft Mode
              </span>
            </div>

            <div>
              <span className="text-[11px] text-content-muted block uppercase">Project Name</span>
              <h3 className="text-base font-serif font-bold text-content-primary mt-1 line-clamp-2">
                {title || "Untitled Project"}
              </h3>
            </div>

            <div className="p-4 rounded-2xl glass-subtle border border-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-content-muted">Private Budget Cap</span>
                <span className="font-serif font-bold text-lg text-content-primary">
                  ${parseFloat(budget || "0").toFixed(2)} USD
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-content-muted">Target Completion</span>
                <span className="font-mono font-semibold text-content-primary">
                  {deadline || "Not Specified"}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 text-xs text-content-secondary">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-emerald shrink-0 mt-0.5" />
                <span>Funds locked in PayPal safe hold only upon bilateral confirmation</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-emerald shrink-0 mt-0.5" />
                <span>Automated sandbox verifies code deliverables before each payout</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-emerald shrink-0 mt-0.5" />
                <span>AI Dispute Agent settles discrepancies with cryptographic audit logs</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
