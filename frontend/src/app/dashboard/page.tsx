"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Shield,
  ArrowRight,
  CheckCircle,
  RefreshCw,
  DollarSign,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Job, SystemStats, fetchJson } from "@/lib/api";

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [isSeeding, setIsSeeding] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [jobsData, statsData] = await Promise.all([
        fetchJson<Job[]>("/jobs"),
        fetchJson<SystemStats>("/stats").catch(() => null),
      ]);
      setJobs(jobsData);
      if (statsData) {
        setStats(statsData);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await fetchJson("/seed", { method: "POST" });
      await loadData();
    } catch (err: any) {
      alert(`Seed failed: ${err.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset all demo scenario records?")) return;
    setIsResetting(true);
    try {
      await fetchJson("/seed/reset", { method: "POST" });
      await loadData();
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "negotiating":
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Negotiating (Agents)
          </span>
        );
      case "awaiting_approval":
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/20">
            Awaiting Approval
          </span>
        );
      case "approved":
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            Approved (Ready to Fund)
          </span>
        );
      case "in_progress":
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
            Funded & In Progress
          </span>
        );
      case "disputed":
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            Disputed (Arbitration)
          </span>
        );
      case "completed":
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Completed
          </span>
        );
      case "no_deal":
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-500/10 text-slate-500 border border-slate-500/20">
            No Deal
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {status}
          </span>
        );
    }
  };

  const filteredJobs = jobs.filter((j) => {
    if (filter === "all") return true;
    if (filter === "active")
      return ["negotiating", "awaiting_approval", "approved", "in_progress"].includes(j.status);
    if (filter === "completed") return j.status === "completed";
    if (filter === "disputed") return j.status === "disputed";
    return true;
  });

  // Calculate totals from stats if available, otherwise from jobs
  const totalDealsCount = stats ? stats.total_jobs : jobs.length;
  const authorizedTotal = stats
    ? stats.total_authorized_usd
    : jobs.reduce((acc, j) => acc + (j.paypal_status === "AUTHORIZED" ? j.max_budget : 0), 0);
  const verifiedCount = stats
    ? stats.verified_milestones_count
    : jobs.filter((j) => j.status === "completed").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Escrow Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Monitor autonomous AI negotiations, PayPal authorized escrows, and milestone releases.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleReset}
            disabled={isResetting}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition"
            title="Reset seeded demo contracts"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>{isResetting ? "Resetting..." : "Reset Demo Data"}</span>
          </button>
          <button
            onClick={handleSeed}
            disabled={isSeeding}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isSeeding ? "Seeding..." : "Seed 3 Scenarios"}</span>
          </button>
          <Link
            href="/jobs/new"
            className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Post New Job</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row backed by real DB state */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-8">
        <div className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Deals
            </span>
            <Shield className="w-5 h-5 text-blue-500" />
          </div>
          <div className="mt-4 text-3xl font-extrabold text-slate-900 dark:text-white">
            {totalDealsCount}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Autonomous escrow contracts in DB</div>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              PayPal Authorized
            </span>
            <DollarSign className="w-5 h-5 text-teal-500" />
          </div>
          <div className="mt-4 text-3xl font-extrabold text-teal-600 dark:text-teal-400">
            ${authorizedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Held securely in sandbox authorizations</div>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Verified & Completed
            </span>
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="mt-4 text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {verifiedCount}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Milestones judged and captured</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 mb-6 border-b border-slate-200 dark:border-slate-800 pb-2">
        {["all", "active", "completed", "disputed"].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition ${
              filter === tab
                ? "bg-blue-600 text-white"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Jobs Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
          <p>Loading contracts...</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-8">
          <Shield className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No jobs found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Get started by posting a job or clicking Seed 3 Scenarios to load polished test cases.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={handleSeed}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              Seed 3 Scenarios
            </button>
            <Link
              href="/jobs/new"
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition"
            >
              Post a Job
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800/90 hover:border-blue-500/50 dark:hover:border-blue-500/40 shadow-sm glow-card flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(job.status)}
                    {job.is_demo && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/10 text-amber-500 border border-amber-500/30 tracking-wider">
                        DEMO DATA
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {new Date(job.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors line-clamp-1">
                  {job.title}
                </h3>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {job.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400">Budget: </span>
                  <strong className="text-slate-900 dark:text-white font-mono text-sm">
                    ${job.max_budget.toFixed(2)} {job.currency}
                  </strong>
                </div>
                <div className="flex items-center space-x-1 text-blue-600 dark:text-sky-400 font-semibold group-hover:translate-x-1 transition-transform">
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
