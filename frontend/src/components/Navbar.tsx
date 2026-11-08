"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Sparkles, Moon, Sun, UserCheck, Briefcase, Plus, Play } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const [role, setRole] = useState<"client" | "freelancer">("client");
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    // Sync dark class on html
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDark]);

  useEffect(() => {
    const savedRole = localStorage.getItem("trustpay_role") as "client" | "freelancer";
    if (savedRole) setRole(savedRole);
  }, []);

  const toggleRole = () => {
    const nextRole = role === "client" ? "freelancer" : "client";
    setRole(nextRole);
    localStorage.setItem("trustpay_role", nextRole);
    window.dispatchEvent(new Event("role_changed"));
  };

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch("http://localhost:8000/api/seed", { method: "POST" });
      const data = await res.json();
      if (data.success && data.scenarios) {
        // Navigate to the passing scenario
        router.push(`/jobs/${data.scenarios.pass_job_id}`);
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Failed to seed demo job:", err);
      router.push("/dashboard");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-[#0a0f1d]/90 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#003087] via-[#0070BA] to-[#00CFDE] flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 via-sky-500 to-teal-400 bg-clip-text text-transparent">
                TrustPay
              </span>
              <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-sky-400 border border-blue-200 dark:border-blue-800/60">
                PayPal AI Escrow
              </span>
            </div>
          </Link>
        </div>

        {/* Center Nav */}
        <nav className="hidden md:flex items-center space-x-1">
          <Link
            href="/"
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
          >
            Overview
          </Link>
          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
          >
            Dashboard
          </Link>
          <Link
            href="/jobs/new"
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>Post Job</span>
          </Link>
        </nav>

        {/* Actions & Role Switcher */}
        <div className="flex items-center space-x-3">
          {/* Seed Demo Button */}
          <button
            onClick={handleSeedDemo}
            disabled={isSeeding}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-indigo-500/10 to-blue-500/10 hover:from-indigo-500/20 hover:to-blue-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 transition"
            title="Preload 3 full verified demo scenarios for live presentation"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isSeeding ? "Seeding..." : "Seed Demo Job"}</span>
          </button>

          {/* Role Switcher Pill */}
          <button
            onClick={toggleRole}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition"
            title="Toggle between Client and Freelancer demo perspective"
          >
            {role === "client" ? (
              <>
                <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                <span>Role: <strong className="text-blue-600 dark:text-sky-400">Client</strong></span>
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Role: <strong className="text-emerald-600 dark:text-emerald-400">Freelancer</strong></span>
              </>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
