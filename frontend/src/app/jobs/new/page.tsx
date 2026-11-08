"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { fetchJson } from "@/lib/api";

const PRESETS = [
  {
    title: "Zero-Knowledge Rollup Settlement Contract",
    description: "Implement an EVM smart contract and verification circuits for optimistic rollup state transitions and proof validation.",
    budget: 1500,
    deadline: "2026-12-10",
  },
  {
    title: "FastAPI Distributed Rate Limiter",
    description: "Build an asynchronous Redis token-bucket rate limiter with IP and token sliding-window policies, 100% test coverage.",
    budget: 950,
    deadline: "2026-11-28",
  },
  {
    title: "PayPal Orders v2 Checkout Integration",
    description: "Construct Next.js 14 and FastAPI checkout flow with server-side authorization and webhook idempotency handling.",
    budget: 1200,
    deadline: "2026-12-05",
  },
];

export default function NewJobPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("1200");
  const [deadline, setDeadline] = useState("2026-12-05");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setTitle(preset.title);
    setDescription(preset.description);
    setBudget(preset.budget.toString());
    setDeadline(preset.deadline);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetchJson<{ id: string }>("/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          max_budget: parseFloat(budget),
          currency: "USD",
          deadline,
        }),
      });

      // Automatically kick off negotiation rounds so the contract and milestones populate
      try {
        await fetchJson(`/jobs/${res.id}/negotiate?run_all=true`, { method: "POST" });
      } catch (negErr) {
        console.warn("Auto-negotiation step:", negErr);
      }

      router.push(`/jobs/${res.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create job.");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        href="/dashboard"
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-6 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Dashboard</span>
      </Link>

      <div className="p-8 rounded-3xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-sky-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Post a Freelance Deal</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The Client Agent and Freelancer Agent will immediately negotiate scope and acceptance criteria.
            </p>
          </div>
        </div>

        {/* Preset chips */}
        <div className="mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Quick Presets (Click to autofill):
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-sky-400 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 transition"
              >
                {p.title} (${p.budget})
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            {typeof error === "string" ? error : JSON.stringify(error)}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Project Title
            </label>
            <input
              type="text"
              required
              minLength={2}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Build Zero-Knowledge Rollup Settlement Contract"
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Detailed Requirements & Scope
            </label>
            <textarea
              required
              minLength={2}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what needs to be built, expected deliverables (code, unit tests, docs), and target tech stack..."
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Maximum Budget (USD)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Target Deadline
              </label>
              <input
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-[#003087] via-[#0070BA] to-sky-500 hover:shadow-lg hover:shadow-blue-500/25 transition flex items-center space-x-2"
            >
              <span>{submitting ? "Initiating Agents..." : "Start AI Negotiation"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

