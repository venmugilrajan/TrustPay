"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, ArrowRight, ArrowLeft, Check, FileText, DollarSign, Eye } from "lucide-react";
import {
  PageHeader,
  Card,
  Input,
  Textarea,
  Select,
  Button,
  Stepper,
  StepItem,
} from "@/components/ui";
import { createJob, stepNegotiation } from "@/lib/api";

const PRESETS = [
  {
    label: "Custom Project (Start from scratch)",
    value: "custom",
    title: "",
    description: "",
    budget: 1000,
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

export default function PostJobWizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedPreset, setSelectedPreset] = useState("custom");

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("1200");
  const [deadline, setDeadline] = useState("2026-12-05");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePresetChange = (presetValue: string) => {
    setSelectedPreset(presetValue);
    const p = PRESETS.find((x) => x.value === presetValue);
    if (p && p.value !== "custom") {
      setTitle(p.title);
      setDescription(p.description);
      setBudget(p.budget.toString());
      setDeadline(p.deadline);
    }
  };

  const steps: StepItem[] = [
    {
      id: 1,
      title: "1. Describe Project",
      state: currentStep === 1 ? "current" : currentStep > 1 ? "completed" : "pending",
    },
    {
      id: 2,
      title: "2. Budget & Deadline",
      state: currentStep === 2 ? "current" : currentStep > 2 ? "completed" : "pending",
    },
    {
      id: 3,
      title: "3. Review & Launch",
      state: currentStep === 3 ? "current" : "pending",
    },
  ];

  const handleNext = () => {
    setError(null);
    if (currentStep === 1) {
      if (!title.trim() || title.trim().length < 2) {
        setError("Please enter a descriptive project title.");
        return;
      }
      if (!description.trim() || description.trim().length < 2) {
        setError("Please provide project requirements or scope.");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const b = parseFloat(budget);
      if (isNaN(b) || b <= 0) {
        setError("Please enter a valid budget in USD.");
        return;
      }
      if (!deadline) {
        setError("Please select a target deadline.");
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      // 1. Create Job in backend
      const newJob = await createJob({
        title,
        description,
        max_budget: parseFloat(budget),
        currency: "USD",
        deadline,
      });

      // 2. Kick off negotiation in background and redirect immediately to contract overview
      stepNegotiation(newJob.id, true).catch((err) => console.warn("Background negotiation:", err));

      // 3. Forward client to the contract detail view
      router.push(`/client/jobs/${newJob.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create project");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <PageHeader
        title="Post a Freelance Project"
        description="Describe your requirements. Your Client AI Agent will negotiate clear milestones and acceptance criteria with the freelancer."
        backHref="/client"
        backLabel="Back to Client Dashboard"
      />

      {/* Stepper Header */}
      <Card padding="sm" className="bg-surface-subtle">
        <Stepper steps={steps} orientation="horizontal" />
      </Card>

      {error && (
        <div className="p-3.5 rounded-btn bg-danger-bg border border-danger-border text-danger text-xs font-medium">
          {error}
        </div>
      )}

      {/* STEP 1: DESCRIBE */}
      {currentStep === 1 && (
        <Card padding="lg" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif font-bold text-content-primary">
              Step 1: Describe the Work
            </h2>
            <div className="w-56">
              <Select
                options={PRESETS.map((p) => ({ label: p.label, value: p.value }))}
                value={selectedPreset}
                onChange={(e) => handlePresetChange(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
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
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="pt-4 flex justify-end">
            <Button size="md" onClick={handleNext}>
              <span>Continue to Budget</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 2: BUDGET & DEADLINE */}
      {currentStep === 2 && (
        <Card padding="lg" className="space-y-6">
          <div>
            <h2 className="text-lg font-serif font-bold text-content-primary">
              Step 2: Budget & Target Deadline
            </h2>
            <p className="text-xs text-content-secondary mt-1">
              Your budget sets the upper bound. The agents will negotiate fair milestone allocations.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Maximum Budget (USD)"
              type="number"
              leftIcon={<span className="text-sm font-serif font-bold">$</span>}
              helperText="Total funds you are willing to authorize in escrow."
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />

            <Input
              label="Target Deadline"
              type="date"
              helperText="Expected completion date for the final milestone."
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div className="pt-4 flex items-center justify-between">
            <Button variant="outline" size="md" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span>Back</span>
            </Button>
            <Button size="md" onClick={handleNext}>
              <span>Review Project</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 3: REVIEW & LAUNCH */}
      {currentStep === 3 && (
        <Card padding="lg" className="space-y-6">
          <div>
            <h2 className="text-lg font-serif font-bold text-content-primary">
              Step 3: Review & Initiate AI Negotiation
            </h2>
            <p className="text-xs text-content-secondary mt-1">
              Review your project details before dispatching the autonomous negotiation agents.
            </p>
          </div>

          <div className="space-y-3 bg-surface-subtle p-4 rounded-card border border-border-subtle text-xs">
            <div>
              <span className="text-content-muted uppercase tracking-wider text-[10px] block font-semibold">
                Project Title
              </span>
              <span className="text-sm font-bold text-content-primary font-serif">
                {title}
              </span>
            </div>

            <div>
              <span className="text-content-muted uppercase tracking-wider text-[10px] block font-semibold">
                Scope & Requirements
              </span>
              <p className="text-content-secondary leading-relaxed mt-0.5">
                {description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border-subtle">
              <div>
                <span className="text-content-muted uppercase tracking-wider text-[10px] block font-semibold">
                  Maximum Escrow Budget
                </span>
                <span className="text-base font-bold font-serif text-primary">
                  ${parseFloat(budget || "0").toFixed(2)} USD
                </span>
              </div>
              <div>
                <span className="text-content-muted uppercase tracking-wider text-[10px] block font-semibold">
                  Deadline
                </span>
                <span className="text-sm font-semibold text-content-primary font-mono">
                  {deadline}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-btn bg-primary-subtle text-primary border border-[#C5D7CE] text-xs space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>What happens next?</span>
            </p>
            <p className="text-content-secondary leading-relaxed">
              Upon clicking Launch, your Client Agent and the Freelancer Agent will immediately negotiate milestones, due dates, and verifiable acceptance criteria in alternating rounds.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <Button variant="outline" size="md" onClick={handleBack} disabled={submitting}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span>Back</span>
            </Button>
            <Button
              size="md"
              onClick={handleSubmit}
              loading={submitting}
              icon={<Sparkles className="w-4 h-4" />}
            >
              Launch AI Negotiation
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

