"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Sparkles, RotateCcw, UserCheck, Code2, Check, ArrowRight, ExternalLink } from "lucide-react";
import { PageHeader, Card, Button, StatusChip, Toast } from "@/components/ui";
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
      const job = await seedDemo();
      setToastMsg(`Demo job seeded successfully: ${job.title}`);
      await loadData();
      router.push(`/client/jobs/${job.id}`);
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
    <div className="min-h-screen bg-cream">
      <header className="border-b border-border-subtle bg-surface sticky top-0 z-30">
        <div className="max-w-content mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-serif font-bold text-lg text-content-primary">TrustPay</span>
            <span className="text-xs text-content-muted">/ Demo Hub</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 text-xs rounded-full bg-cream-200 text-content-secondary border border-border-subtle font-mono">
              Sandbox Mode
            </span>
            <Link href="/">
              <Button variant="ghost" size="sm">
                Exit to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-content mx-auto px-4 sm:px-6 py-10 space-y-8">
        <PageHeader
          title="Sandbox & Demonstration Hub"
          description="Tools for hackathon judges and evaluators to seed test data, switch view perspectives, and verify PayPal escrow workflows."
          backHref="/"
          backLabel="Back to Role Selection"
        />

        {/* Quick Portal Switcher */}
        <div className="grid sm:grid-cols-2 gap-6">
          <Card padding="md" className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-card bg-primary-subtle text-primary flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-content-primary">
                  View as Client
                </h3>
                <p className="text-xs text-content-secondary">
                  Post projects, authorize PayPal escrow, approve contracts
                </p>
              </div>
            </div>

            <Link href="/client" className="block">
              <Button variant="primary" size="md" className="w-full">
                <span>Open Client Portal</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </Card>

          <Card padding="md" className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-card bg-accent-subtle text-accent flex items-center justify-center">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-content-primary">
                  View as Freelancer
                </h3>
                <p className="text-xs text-content-secondary">
                  Browse deals, submit deliverables to AI Judge, receive payouts
                </p>
              </div>
            </div>

            <Link href="/freelancer" className="block">
              <Button variant="secondary" size="md" className="w-full">
                <span>Open Freelancer Portal</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </Card>
        </div>

        {/* Demo Operations Card */}
        <Card padding="lg" className="space-y-6">
          <div>
            <h3 className="font-serif font-bold text-lg text-content-primary">
              Demo Data Lifecycle
            </h3>
            <p className="text-xs text-content-secondary mt-1">
              Seed a complete end-to-end negotiated freelance contract or purge test rows to return to a clean baseline.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleSeed}
              loading={seeding}
              icon={<Sparkles className="w-4 h-4" />}
            >
              Seed Complete Demo Contract
            </Button>

            <Button
              variant="outline"
              size="md"
              onClick={handleReset}
              loading={resetting}
              icon={<RotateCcw className="w-4 h-4 text-danger" />}
            >
              Reset Demo Records
            </Button>
          </div>

          <div className="p-4 rounded-btn bg-surface-subtle border border-border-subtle text-xs text-content-secondary space-y-1">
            <p className="font-semibold text-content-primary">Seeded Contract Features:</p>
            <ul className="list-disc list-inside space-y-0.5 text-content-secondary">
              <li>Pre-negotiated by Client Agent and Freelancer Agent across 3 rounds</li>
              <li>2 granular milestones with acceptance criteria ready for testing</li>
              <li>Tagged with <StatusChip status="demo_data" className="scale-90" /> for complete audit transparency</li>
            </ul>
          </div>
        </Card>

        {/* System Diagnostics Metrics */}
        {stats && (
          <Card padding="md" className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-content-secondary">
              Live Backend State
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 bg-surface-subtle rounded border border-border-subtle">
                <span className="text-content-muted block font-sans">Active Deals:</span>
                <span className="text-base font-bold text-content-primary">{stats.active_jobs}</span>
              </div>
              <div className="p-3 bg-surface-subtle rounded border border-border-subtle">
                <span className="text-content-muted block font-sans">Total Authorized:</span>
                <span className="text-base font-bold text-primary">${stats.total_authorized_usd.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-surface-subtle rounded border border-border-subtle">
                <span className="text-content-muted block font-sans">Total Captured:</span>
                <span className="text-base font-bold text-content-primary">${stats.total_captured_usd.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-surface-subtle rounded border border-border-subtle">
                <span className="text-content-muted block font-sans">Verified Releases:</span>
                <span className="text-base font-bold text-content-primary">{stats.verified_milestones_count}</span>
              </div>
            </div>
          </Card>
        )}
      </main>

      {toastMsg && <Toast message={toastMsg} type="success" onClose={() => setToastMsg(null)} />}
    </div>
  );
}
