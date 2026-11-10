"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  Sparkles,
  RotateCcw,
  UserCheck,
  Code2,
  Check,
  ArrowRight,
  Database,
  Lock,
  Layers,
  Scale,
  CheckCircle2,
} from "lucide-react";
import GlassButton from "@/components/glass/GlassButton";
import GlassCard from "@/components/glass/GlassCard";
import AuroraBackground from "@/components/glass/AuroraBackground";
import { ThemeToggle } from "@/components/glass/GlassNav";
import AccountSwitcher from "@/components/ui/AccountSwitcher";
import { seedDemo, resetDemo, getStats, SystemStats } from "@/lib/api";

export default function DemoPage() {
  const router = useRouter();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const s = await getStats();
      setStats(s);
    } catch (err) {
      console.warn("Failed to load stats:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDemo();
      setToastMsg("3 demonstration scenarios seeded successfully (Passed Stage, Partial Delivery, Active Dispute).");
      await loadData();
    } catch (err: any) {
      alert(`Seeding error: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset all demo contracts?")) return;
    setResetting(true);
    try {
      await resetDemo();
      setToastMsg("Demo data reset successfully.");
      await loadData();
    } catch (err: any) {
      alert(`Reset error: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-content-primary flex flex-col relative">
      <AuroraBackground />

      <header className="glass-nav sticky top-0 z-40">
        <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-accent text-white flex items-center justify-center shadow-subtle group-hover:scale-105 transition-transform">
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-serif font-bold text-lg text-content-primary tracking-tight">
              TrustPay
            </span>
            <span className="text-xs text-content-muted">/ Demo Hub</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 text-xs rounded-full glass border border-border text-content-secondary font-mono">
              Judges & Testers Hub
            </span>
            <ThemeToggle />
            <AccountSwitcher currentRole="client" />
            <Link href="/">
              <GlassButton variant="ghost" size="sm">
                Home
              </GlassButton>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-content mx-auto px-4 sm:px-6 py-10 space-y-8 content-layer">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-content-primary tracking-tight">
            Sandbox & Demonstration Hub
          </h1>
          <p className="text-sm text-content-secondary mt-1">
            Tools for hackathon judges and evaluators to seed test data, switch role perspectives, and verify PayPal safe hold workflows.
          </p>
        </div>

        {/* Quick Portal Switcher */}
        <div className="grid sm:grid-cols-2 gap-5">
          <GlassCard variant="default" className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-accent/15 text-accent flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-serif font-bold text-base text-content-primary">
                  View as Client
                </h2>
                <p className="text-xs text-content-secondary">
                  Post projects, authorize PayPal safe hold, approve contracts
                </p>
              </div>
            </div>
            <Link href="/client" className="block">
              <GlassButton variant="primary" size="md" className="w-full">
                <span>Enter Client Portal</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </GlassButton>
            </Link>
          </GlassCard>

          <GlassCard variant="default" className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-accent-emerald/15 text-accent-emerald flex items-center justify-center">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-serif font-bold text-base text-content-primary">
                  View as Freelancer
                </h2>
                <p className="text-xs text-content-secondary">
                  Browse jobs, submit deliverables, receive automated payouts
                </p>
              </div>
            </div>
            <Link href="/freelancer" className="block">
              <GlassButton variant="secondary" size="md" className="w-full">
                <span>Enter Freelancer Portal</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </GlassButton>
            </Link>
          </GlassCard>
        </div>

        {/* 3 Pre-Packaged Demo Scenarios */}
        <div className="content-solid p-6 space-y-5">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold font-serif text-content-primary">
                3 Pre-Configured End-to-End Test Scenarios
              </h2>
              <p className="text-xs text-content-secondary mt-0.5">
                Pre-loaded contracts demonstrating full lifecycle states and automated PayPal captures.
              </p>
            </div>
            <span className="text-xs text-content-muted font-mono">Real-Time Data</span>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Scenario A */}
            <div className="glass-subtle p-4 rounded-2xl space-y-2 border border-border">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-accent-emerald">Scenario A: 100% Pass</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-accent-emerald" />
              </div>
              <h3 className="text-xs font-semibold text-content-primary">
                ETL Pipeline ($1,200)
              </h3>
              <p className="text-[11px] text-content-secondary">
                Two payment stages delivered. Unit tests pass 100%. Payout released via PayPal capture.
              </p>
            </div>

            {/* Scenario B */}
            <div className="glass-subtle p-4 rounded-2xl space-y-2 border border-border">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-warning">Scenario B: Partial Delivery</span>
                <Scale className="w-3.5 h-3.5 text-warning" />
              </div>
              <h3 className="text-xs font-semibold text-content-primary">
                ZK Rollup Verifier ($1,500)
              </h3>
              <p className="text-[11px] text-content-secondary">
                Stage 1 passed ($500). Stage 2 passed partial tests (60% payout $300, $200 returned).
              </p>
            </div>

            {/* Scenario C */}
            <div className="glass-subtle p-4 rounded-2xl space-y-2 border border-border">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-danger">Scenario C: Active Dispute</span>
                <Scale className="w-3.5 h-3.5 text-danger" />
              </div>
              <h3 className="text-xs font-semibold text-content-primary">
                Kafka Cluster ($900)
              </h3>
              <p className="text-[11px] text-content-secondary">
                Deliverable raised dispute. Neutral AI Dispute Agent reviewing evidence for binding verdict.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border">
            <GlassButton
              variant="primary"
              size="md"
              loading={seeding}
              onClick={handleSeed}
              icon={<Database className="w-4 h-4" />}
            >
              Seed All 3 Scenarios
            </GlassButton>
            <GlassButton
              variant="secondary"
              size="md"
              loading={resetting}
              onClick={handleReset}
              icon={<RotateCcw className="w-4 h-4" />}
            >
              Reset Demo Data
            </GlassButton>
          </div>
        </div>

        {/* Toast confirmation */}
        {toastMsg && (
          <div className="toast-glass p-3 px-5 text-xs text-content-primary text-center max-w-md mx-auto shadow-glass-strong border border-border">
            {toastMsg}
          </div>
        )}
      </main>
    </div>
  );
}
