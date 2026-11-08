import React from "react";
import Link from "next/link";
import { Shield, ArrowRight, UserCheck, Code2, Lock, CheckCircle2, Scale } from "lucide-react";
import Button from "@/components/ui/Button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-border-subtle bg-surface/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-content mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-btn bg-primary flex items-center justify-center text-primary-foreground">
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-serif font-bold text-xl text-content-primary tracking-tight">
              TrustPay
            </span>
            <span className="text-[10px] font-sans font-medium px-2 py-0.5 rounded-full bg-surface-subtle text-content-secondary border border-border-subtle">
              PayPal AI Escrow
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/demo">
              <Button variant="ghost" size="sm">
                Demo Hub
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-content mx-auto px-4 sm:px-6 py-12 lg:py-20 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-subtle border border-border-subtle text-xs text-content-secondary font-medium">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span>Autonomous Freelance Escrow Powered by PayPal & AI</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-content-primary leading-tight">
            Fair payment, verified by AI. Protected by PayPal.
          </h1>

          <p className="text-base text-content-secondary leading-relaxed max-w-xl mx-auto">
            Two AI agents negotiate your freelance scope and milestones. PayPal securely holds the funds, and an AI Judge tests deliverables before releasing payment.
          </p>
        </div>

        {/* Two Separate Role Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mt-12 w-full">
          {/* Client Card */}
          <Link
            href="/client"
            className="group block p-8 rounded-card bg-surface border border-border-subtle hover:border-primary shadow-soft hover:shadow-elevated transition-all duration-200"
          >
            <div className="w-12 h-12 rounded-card bg-primary-subtle text-primary flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <UserCheck className="w-6 h-6" />
            </div>

            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Client Portal
            </span>
            <h2 className="text-2xl font-serif font-bold text-content-primary mt-1">
              I&apos;m hiring a freelancer
            </h2>
            <p className="mt-2 text-sm text-content-secondary leading-relaxed">
              Post freelance projects in plain English. Let your AI agent negotiate clear acceptance criteria and fund escrow with PayPal authorizations.
            </p>

            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-primary group-hover:text-primary-hover">
              <span>Enter Hiring Hub</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Freelancer Card */}
          <Link
            href="/freelancer"
            className="group block p-8 rounded-card bg-surface border border-border-subtle hover:border-primary shadow-soft hover:shadow-elevated transition-all duration-200"
          >
            <div className="w-12 h-12 rounded-card bg-cream-200 text-content-primary flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Code2 className="w-6 h-6" />
            </div>

            <span className="text-xs font-semibold uppercase tracking-wider text-accent">
              Freelancer Portal
            </span>
            <h2 className="text-2xl font-serif font-bold text-content-primary mt-1">
              I&apos;m a freelancer
            </h2>
            <p className="mt-2 text-sm text-content-secondary leading-relaxed">
              Find verified contracts with guaranteed funds. Submit code or assets to the automated AI Judge and receive guaranteed payouts.
            </p>

            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-primary group-hover:text-primary-hover">
              <span>Enter Worker Workspace</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>

        {/* 3-Step "How It Works" Section */}
        <div className="mt-20 pt-16 border-t border-border-subtle max-w-3xl mx-auto w-full">
          <div className="text-center mb-10">
            <h3 className="text-xl font-serif font-bold text-content-primary">
              How TrustPay Works
            </h3>
            <p className="text-xs text-content-secondary mt-1">
              Guaranteed payment for freelancers, guaranteed delivery for clients.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <div className="p-5 rounded-card bg-surface border border-border-subtle space-y-2">
              <div className="w-8 h-8 rounded-full bg-surface-subtle text-primary flex items-center justify-center font-bold text-xs border border-border-subtle">
                1
              </div>
              <h4 className="text-sm font-bold text-content-primary">AI Agents Negotiate</h4>
              <p className="text-xs text-content-secondary leading-relaxed">
                Your buyer agent and the freelancer agent agree on price, deadlines, and granular acceptance criteria.
              </p>
            </div>

            <div className="p-5 rounded-card bg-surface border border-border-subtle space-y-2">
              <div className="w-8 h-8 rounded-full bg-surface-subtle text-primary flex items-center justify-center font-bold text-xs border border-border-subtle">
                2
              </div>
              <h4 className="text-sm font-bold text-content-primary">PayPal Holds Escrow</h4>
              <p className="text-xs text-content-secondary leading-relaxed">
                Funds are authorized via PayPal Orders v2 with <code className="font-mono text-content-primary">intent: AUTHORIZE</code>. No blind upfront charges.
              </p>
            </div>

            <div className="p-5 rounded-card bg-surface border border-border-subtle space-y-2">
              <div className="w-8 h-8 rounded-full bg-surface-subtle text-primary flex items-center justify-center font-bold text-xs border border-border-subtle">
                3
              </div>
              <h4 className="text-sm font-bold text-content-primary">AI Judge Releases Pay</h4>
              <p className="text-xs text-content-secondary leading-relaxed">
                Submissions are executed in an isolated sandbox. Passing criteria triggers milestone release via PayPal capture.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle bg-surface/50 py-6">
        <div className="max-w-content mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-content-muted">
          <div>
            <span>© 2026 TrustPay. PayPal AI Hackathon Devpost submission.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/demo" className="hover:text-content-primary underline">
              Demo Mode & Sandbox Tools
            </Link>
            <a
              href="https://github.com/venmugilrajan/TrustPay"
              target="_blank"
              rel="noreferrer"
              className="hover:text-content-primary"
            >
              GitHub Repository
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
