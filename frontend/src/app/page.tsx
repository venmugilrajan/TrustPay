"use client";

import React, { useEffect, useState, memo } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Shield,
  ArrowRight,
  UserCheck,
  Code2,
  Lock,
  CheckCircle2,
  Scale,
  Sparkles,
  Zap,
  Terminal,
  ChevronDown,
  Layers,
  Check,
  Building2,
  HelpCircle,
} from "lucide-react";
import GlassButton from "@/components/glass/GlassButton";
import GlassCard from "@/components/glass/GlassCard";
import AuroraBackground from "@/components/glass/AuroraBackground";
import { ThemeToggle } from "@/components/glass/GlassNav";
import HowItWorksDrawer from "@/components/glass/HowItWorksDrawer";
import AccountSwitcher from "@/components/ui/AccountSwitcher";

// Isolated Lifecycle Simulation with Specular Sheen
const HeroLifecycleSimulator = memo(function HeroLifecycleSimulator() {
  const shouldReduceMotion = useReducedMotion();
  const [activeStoryStep, setActiveStoryStep] = useState(0);

  useEffect(() => {
    if (shouldReduceMotion) return;
    const interval = setInterval(() => {
      setActiveStoryStep((prev) => (prev + 1) % 4);
    }, 3400);
    return () => clearInterval(interval);
  }, [shouldReduceMotion]);

  return (
    <div className="relative mx-auto w-full max-w-[620px] h-[500px] glass-strong p-6 sm:p-7 shadow-glass-strong flex flex-col justify-between overflow-hidden">
      {/* Simulation Header */}
      <div className="flex items-center justify-between border-b border-border pb-3.5 relative z-10">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-accent-emerald animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-content-primary">
            Autonomous Deal Simulation
          </span>
        </div>
        <span className="text-[11px] font-mono px-3 py-0.5 rounded-full glass border border-border text-content-secondary font-semibold">
          Stage {activeStoryStep + 1} of 4
        </span>
      </div>

      {/* Dynamic Simulation Body */}
      <div className="relative flex-1 py-4 flex flex-col justify-center z-10">
        <AnimatePresence mode="wait">
          {activeStoryStep === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="space-y-3.5"
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-content-muted">
                Step 1: Bilateral Agent Bargaining
              </div>
              <div className="p-3.5 rounded-2xl glass-subtle border border-border text-xs space-y-1">
                <span className="text-[10px] font-bold text-accent uppercase block">Client AI Agent</span>
                <p className="text-content-secondary">
                  &ldquo;Project scope is clear. Proposing $1,400 across two payment stages with strict sandbox verification.&rdquo;
                </p>
              </div>
              <div className="p-3.5 rounded-2xl glass-subtle border border-border text-xs space-y-1 ml-4 border-l-2 border-l-accent-emerald">
                <span className="text-[10px] font-bold text-accent-emerald uppercase block">Freelancer AI Agent</span>
                <p className="text-content-secondary">
                  &ldquo;Factoring Docker container harness and unit tests, $1,250 achieves complete test coverage.&rdquo;
                </p>
              </div>
              <div className="flex items-center justify-between text-xs px-4 py-2.5 rounded-2xl bg-accent-emerald/10 text-content-primary border border-accent-emerald/25">
                <span className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-accent-emerald" />
                  Consensus Draft Locked
                </span>
                <span className="font-serif font-bold text-base text-accent-emerald">$1,250.00 USD</span>
              </div>
            </motion.div>
          )}

          {activeStoryStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-content-muted">
                Step 2: PayPal Safe Hold Authorization
              </div>
              <div className="p-6 rounded-2xl glass-subtle border border-border text-center space-y-3.5">
                <div className="w-14 h-14 rounded-full bg-accent-emerald/15 border border-accent-emerald/30 text-accent-emerald mx-auto flex items-center justify-center">
                  <Lock className="w-7 h-7" />
                </div>
                <div>
                  <div className="font-serif font-bold text-xl text-content-primary">$1,250.00 Authorized</div>
                  <div className="text-xs text-content-secondary mt-1">
                    Funds safely locked by PayPal. Freelancer begins building deliverables.
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-mono px-3 py-1 rounded-full bg-surface/80 border border-border text-content-muted">
                  <span className="w-2 h-2 rounded-full bg-accent-emerald" />
                  PayPal Orders v2 · Intent: AUTHORIZE
                </div>
              </div>
            </motion.div>
          )}

          {activeStoryStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="space-y-3.5"
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-content-muted">
                Step 3: Sandbox Verification & Testing
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 text-slate-100 font-mono text-xs space-y-2 border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 text-[10px] border-b border-slate-800 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-accent-emerald" />
                    docker run --network none sandbox:latest
                  </span>
                  <span className="text-accent-emerald">PASS (100%)</span>
                </div>
                <div className="text-[11px] space-y-1 text-slate-300">
                  <p className="text-emerald-400">PASS: test_session_memory_redis: PASSED</p>
                  <p className="text-emerald-400">PASS: test_rate_limiter_token_bucket: PASSED</p>
                  <p className="text-emerald-400">PASS: test_injection_sanitization: PASSED</p>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-accent-emerald/10 border border-accent-emerald/25 text-xs flex items-center justify-between text-content-primary">
                <span className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-accent-emerald" />
                  Verification Score: 100 / 100
                </span>
                <span className="text-accent-emerald font-bold">Passed</span>
              </div>
            </motion.div>
          )}

          {activeStoryStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 text-center"
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-content-muted">
                Step 4: Automated PayPal Payment Release
              </div>
              <div className="p-6 rounded-2xl glass-subtle border border-border space-y-3.5">
                <div className="w-14 h-14 rounded-full bg-accent-emerald/15 border border-accent-emerald/30 text-accent-emerald mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <div className="font-serif font-bold text-2xl text-accent-emerald">
                    $625.00 Payout Released
                  </div>
                  <div className="text-xs text-content-secondary mt-1">
                    Funds immediately transferred to freelancer. Zero human delays.
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-3 py-1 rounded-full bg-surface/80 border border-border text-content-muted">
                  PayPal Capture ID: 3T111224HC540804F
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Simulation Progress Dots */}
      <div className="pt-3 border-t border-border flex items-center justify-between relative z-10">
        <span className="text-[11px] text-content-muted font-medium">Click to jump:</span>
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((step) => (
            <button
              key={step}
              onClick={() => setActiveStoryStep(step)}
              className={`h-2 rounded-full transition-all duration-300 ${
                activeStoryStep === step ? "w-8 bg-accent" : "w-2 bg-border hover:bg-content-muted"
              }`}
              aria-label={`Jump to stage ${step + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "How does safe hold work with PayPal?",
      a: "When a contract is approved, the client authorizes payment via PayPal. Funds are held safely under PayPal's institutional custody — not deposited to TrustPay. When deliverables pass automated test checks, payment releases instantly to the freelancer.",
    },
    {
      q: "What is an autonomous bilateral negotiation?",
      a: "Both client and freelancer provide private rate and timeline constraints. Two AI agents negotiate in real-time, proposing counter-offers until an optimal consensus is locked. Private budget caps are never revealed to the other party.",
    },
    {
      q: "How does automated code checking prevent fraud?",
      a: "Deliverables execute inside an isolated Docker sandbox with zero network access and strict CPU limits. Tests run independently against the agreed deliverables. Neither party can tamper with test results.",
    },
    {
      q: "What happens if there is a dispute?",
      a: "An independent AI Dispute Arbitrator evaluates raw git commits, test outputs, and communication history to issue a binding, fair split based on verified completion evidence.",
    },
  ];

  return (
    <div className="min-h-screen bg-canvas text-content-primary flex flex-col relative">
      <AuroraBackground />

      {/* Floating Glass Top Navigation */}
      <header className="glass-nav sticky top-0 z-50">
        <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-subtle group-hover:scale-105 transition-transform">
                <Shield className="w-4 h-4" />
              </div>
              <span className="font-serif font-bold text-xl text-content-primary tracking-tight">
                TrustPay
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <a
                href="#how-it-works"
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-content-secondary hover:text-content-primary hover:bg-border/60 transition-colors"
              >
                How It Works
              </a>
              <a
                href="#autonomous-negotiation"
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-content-secondary hover:text-content-primary hover:bg-border/60 transition-colors"
              >
                AI Negotiation
              </a>
              <a
                href="#automated-checking"
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-content-secondary hover:text-content-primary hover:bg-border/60 transition-colors"
              >
                Verification
              </a>
              <Link
                href="/demo"
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-accent hover:bg-accent/10 transition-colors flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Demo Hub</span>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <HowItWorksDrawer />
            <ThemeToggle />
            <AccountSwitcher currentRole="client" />
            <Link href="/client" className="hidden sm:inline-block">
              <GlassButton variant="primary" size="sm">
                Open App
              </GlassButton>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 content-layer">
        <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Headline & Value Proposition */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass border border-border text-xs font-semibold text-content-primary shadow-subtle">
                <span className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse" />
                <span>Autonomous AI Escrow & Milestone Verification</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-serif font-bold text-content-primary tracking-tight leading-[1.1]">
                Get paid for work that&rsquo;s proven.
              </h1>

              <p className="text-base sm:text-lg text-content-secondary max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Autonomous AI agents negotiate terms, PayPal safely holds funds, and an automated code test runner releases payouts upon 100% verified delivery.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link href="/client" className="w-full sm:w-auto">
                  <GlassButton
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto"
                    icon={<ArrowRight className="w-4 h-4 ml-1 order-last" />}
                  >
                    I&rsquo;m Hiring (Client)
                  </GlassButton>
                </Link>
                <Link href="/freelancer" className="w-full sm:w-auto">
                  <GlassButton
                    variant="glass"
                    size="lg"
                    className="w-full sm:w-auto"
                    icon={<Code2 className="w-4 h-4" />}
                  >
                    I&rsquo;m a Freelancer
                  </GlassButton>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="pt-4 flex items-center justify-center lg:justify-start gap-6 text-xs text-content-muted">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-accent-emerald" />
                  <span>PayPal Custody</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-accent-emerald" />
                  <span>Sandbox Isolation</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-accent-emerald" />
                  <span>Zero Human Delays</span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Lifecycle Simulator */}
            <div className="lg:col-span-6">
              <HeroLifecycleSimulator />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 1: HOW IT WORKS (4 guided stages) */}
      <section id="how-it-works" className="py-20 border-t border-border content-layer">
        <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
              Streamlined Flow
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-content-primary">
              Four steps. Zero friction.
            </h2>
            <p className="text-sm text-content-secondary leading-relaxed">
              Every freelance agreement executes automatically from contract negotiation to final release.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <GlassCard variant="default" className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-accent/15 text-accent flex items-center justify-center font-bold text-base">
                1
              </div>
              <h3 className="font-serif font-bold text-lg text-content-primary">
                Bilateral Negotiation
              </h3>
              <p className="text-xs text-content-secondary leading-relaxed">
                Autonomous AI agents negotiate price, deliverables, and payment stages in seconds, keeping private budget limits secret.
              </p>
            </GlassCard>

            <GlassCard variant="default" className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-accent-emerald/15 text-accent-emerald flex items-center justify-center font-bold text-base">
                2
              </div>
              <h3 className="font-serif font-bold text-lg text-content-primary">
                PayPal Safe Hold
              </h3>
              <p className="text-xs text-content-secondary leading-relaxed">
                Client authorizes payment into PayPal safe hold. Funds remain secure in institutional custody until deliverables pass tests.
              </p>
            </GlassCard>

            <GlassCard variant="default" className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-warning/15 text-warning flex items-center justify-center font-bold text-base">
                3
              </div>
              <h3 className="font-serif font-bold text-lg text-content-primary">
                Automated Checking
              </h3>
              <p className="text-xs text-content-secondary leading-relaxed">
                Code deliverables run inside an isolated Docker sandbox against agreed pytest suites. No human bias, no subjective delays.
              </p>
            </GlassCard>

            <GlassCard variant="default" className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-bold text-base">
                4
              </div>
              <h3 className="font-serif font-bold text-lg text-content-primary">
                Instant Release
              </h3>
              <p className="text-xs text-content-secondary leading-relaxed">
                Upon 100% test pass, PayPal capture executes automatically. Payouts arrive in the freelancer&rsquo;s account without waiting.
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* SECTION 2: DEDICATED PORTALS */}
      <section className="py-20 border-t border-border content-layer">
        <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Role Tailored Experience
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-content-primary">
              Built specifically for both sides.
            </h2>
            <p className="text-sm text-content-secondary leading-relaxed">
              Dedicated interfaces with role-tailored wording, private credentials, and isolated data boundaries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Client Portal Card */}
            <div className="content-solid p-8 sm:p-10 shadow-soft flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-accent/15 text-accent flex items-center justify-center">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-content-primary">
                  I&rsquo;m Hiring (Client Portal)
                </h3>
                <p className="text-sm text-content-secondary leading-relaxed">
                  Post freelance projects with confidential budget caps. Review proposals, monitor autonomous negotiations, authorize PayPal holds with one click, and review verified code deliverables.
                </p>
                <ul className="text-xs text-content-secondary space-y-2 pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent-emerald" />
                    <span>3-Step guided project creation wizard</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent-emerald" />
                    <span>Multi-turn autonomous agent bargaining</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent-emerald" />
                    <span>PayPal Orders v2 institutional safe hold</span>
                  </li>
                </ul>
              </div>

              <Link href="/client">
                <GlassButton variant="primary" size="lg" className="w-full">
                  <span>Enter Client Portal</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </GlassButton>
              </Link>
            </div>

            {/* Freelancer Portal Card */}
            <div className="content-solid p-8 sm:p-10 shadow-soft flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-accent-emerald/15 text-accent-emerald flex items-center justify-center">
                  <Code2 className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-content-primary">
                  I&rsquo;m a Freelancer
                </h3>
                <p className="text-sm text-content-secondary leading-relaxed">
                  Browse opportunities with guaranteed PayPal escrow budgets. Define your private rate floor, submit deliverables to the Docker verification sandbox, and receive guaranteed automated payouts.
                </p>
                <ul className="text-xs text-content-secondary space-y-2 pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent-emerald" />
                    <span>Agent-backed rate negotiation advocacy</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent-emerald" />
                    <span>Isolated sandbox test harness execution</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent-emerald" />
                    <span>Guaranteed payouts on 100% passing tests</span>
                  </li>
                </ul>
              </div>

              <Link href="/freelancer">
                <GlassButton variant="secondary" size="lg" className="w-full">
                  <span>Enter Freelancer Portal</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </GlassButton>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: FAQ */}
      <section className="py-20 border-t border-border content-layer">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-content-primary">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-content-secondary">
              Everything you need to know about autonomous safe hold and automated checking.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="content-solid p-5 cursor-pointer transition-all hover:border-accent/40"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              >
                <div className="flex items-center justify-between font-semibold text-sm text-content-primary">
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-content-muted transition-transform duration-200 ${
                      openFaq === idx ? "rotate-180 text-accent" : ""
                    }`}
                  />
                </div>
                {openFaq === idx && (
                  <p className="text-xs text-content-secondary mt-3 pt-3 border-t border-border leading-relaxed">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 glass-subtle text-xs text-content-muted content-layer">
        <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-primary text-white flex items-center justify-center font-bold text-xs">
              T
            </div>
            <span className="font-semibold text-content-primary">TrustPay</span>
            <span>· Autonomous AI Escrow with PayPal Authorizations</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/demo" className="text-accent hover:underline font-semibold">
              Demo Hub
            </Link>
            <Link href="/client" className="hover:text-content-primary">
              Client Portal
            </Link>
            <Link href="/freelancer" className="hover:text-content-primary">
              Freelancer Portal
            </Link>
            <span>PayPal Sandbox Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
