"use client";

import React, { useEffect, useState } from "react";
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
  HelpCircle,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import Button from "@/components/ui/Button";

export default function LandingPage() {
  const shouldReduceMotion = useReducedMotion();
  const [activeStoryStep, setActiveStoryStep] = useState(0); // 0: Negotiate, 1: Lock, 2: Verify, 3: Release
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  // 10s Storyboard loop cycling every 2.5s per step
  useEffect(() => {
    if (shouldReduceMotion) return;
    const interval = setInterval(() => {
      setActiveStoryStep((prev) => (prev + 1) % 4);
    }, 2800);
    return () => clearInterval(interval);
  }, [shouldReduceMotion]);

  const storySteps = [
    {
      title: "1. Autonomous Negotiation",
      desc: "Client & Freelancer agents meet in private, trading offers within reservation limits until terms align.",
      badge: "3-6 Rounds Consensus",
    },
    {
      title: "2. Escrow Locked",
      desc: "Client funds a PayPal Orders v2 AUTHORIZE hold. Money is locked securely until milestones are proven.",
      badge: "Zero-Risk Custody",
    },
    {
      title: "3. Code Verification",
      desc: "Deliverables execute in isolated Docker harnesses. AI Judge tests code against concrete acceptance criteria.",
      badge: "Passing Verdict",
    },
    {
      title: "4. Automated Release",
      desc: "Only on a verified passing score (>=70%), PayPal captures and releases funds instantly to the freelancer.",
      badge: "Instant Payout",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-content-primary flex flex-col justify-between selection:bg-accent-subtle selection:text-accent font-sans">
      {/* Sticky frosted glass header */}
      <header className="border-b border-border bg-white/90 backdrop-blur-md sticky top-0 z-40 transition-all">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-subtle">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="font-serif font-bold text-xl text-content-primary tracking-tight">
              TrustPay
            </span>
            <span className="hidden sm:inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full bg-surface-subtle text-content-secondary border border-border">
              PayPal Orders v2
            </span>
          </Link>

          <nav className="flex items-center gap-3">
            <a href="#how-it-works" className="text-sm font-medium text-content-secondary hover:text-content-primary transition-colors px-3 py-1.5 hidden md:inline-block">
              How It Works
            </a>
            <a href="#security" className="text-sm font-medium text-content-secondary hover:text-content-primary transition-colors px-3 py-1.5 hidden md:inline-block">
              Verification
            </a>
            <a href="#faq" className="text-sm font-medium text-content-secondary hover:text-content-primary transition-colors px-3 py-1.5 hidden md:inline-block">
              FAQ
            </a>
            <Link href="/demo">
              <Button variant="outline" size="sm">
                Sandbox Mode
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-border">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-10 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Editorial Headline & Actions */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-subtle border border-emerald-200 text-xs font-semibold text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Autonomous AI Escrow & Code Verification</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-serif font-bold text-content-primary tracking-tight leading-[1.08]">
                Get paid for work that’s <span className="text-emerald-700 italic">proven</span>.
              </h1>

              <p className="text-base sm:text-lg text-content-secondary leading-relaxed max-w-xl">
                Autonomous agents negotiate scope and price within private limits. PayPal locks client funds in escrow, and an AI Judge tests deliverables before releasing a single dollar.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Link href="/client">
                  <Button size="lg" className="w-full sm:w-auto shadow-elevated gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-300" />
                    <span>I’m hiring (Client Portal)</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>

                <Link href="/freelancer">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2">
                    <Code2 className="w-4 h-4 text-content-secondary" />
                    <span>I’m a freelancer</span>
                  </Button>
                </Link>
              </div>

              {/* Trust Badges Row */}
              <div className="pt-6 border-t border-border grid grid-cols-3 gap-4 text-xs text-content-secondary">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-surface-subtle border border-border flex items-center justify-center text-primary">
                    <Lock className="w-3 h-3 text-emerald-600" />
                  </div>
                  <span>PayPal Escrow Hold</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-surface-subtle border border-border flex items-center justify-center text-primary">
                    <Terminal className="w-3 h-3 text-primary" />
                  </div>
                  <span>Sandboxed Code Tests</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-surface-subtle border border-border flex items-center justify-center text-primary">
                    <Scale className="w-3 h-3 text-amber-600" />
                  </div>
                  <span>Dispute Arbitration</span>
                </div>
              </div>
            </div>

            {/* Right Column: Layered Floating UI Storyboard */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto w-full max-w-[440px] h-[480px] bg-surface-subtle rounded-2xl border border-border p-6 shadow-float flex flex-col justify-between overflow-hidden">
                
                {/* Story header bar */}
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-semibold text-content-primary">Lifecycle Simulation</span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white border border-border text-content-muted">
                    Round {activeStoryStep + 1} / 4
                  </span>
                </div>

                {/* Animated Story Stages */}
                <div className="relative flex-1 py-4 flex flex-col justify-center">
                  <AnimatePresence mode="wait">
                    {activeStoryStep === 0 && (
                      <motion.div
                        key="step-0"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-3"
                      >
                        <div className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                          Step 1: Autonomous Agent Negotiation
                        </div>
                        {/* Bubble 1: Client */}
                        <div className="p-3 rounded-xl bg-white border border-border shadow-subtle text-xs space-y-1">
                          <span className="text-[10px] font-semibold text-primary uppercase">Client Agent</span>
                          <p className="text-content-secondary">"Deliverables look solid. Can we target $1,400 with 2 milestones?"</p>
                        </div>
                        {/* Bubble 2: Freelancer */}
                        <div className="p-3 rounded-xl bg-white border border-border shadow-subtle text-xs space-y-1 ml-4">
                          <span className="text-[10px] font-semibold text-emerald-700 uppercase">Freelancer Agent</span>
                          <p className="text-content-secondary">"With automated test suites and Redis caching, $1,250 is optimal."</p>
                        </div>
                        {/* Status banner */}
                        <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <span className="font-medium">Consensus Reached</span>
                          <span className="font-serif font-bold text-sm">$1,250.00 USD</span>
                        </div>
                      </motion.div>
                    )}

                    {activeStoryStep === 1 && (
                      <motion.div
                        key="step-1"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-4"
                      >
                        <div className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                          Step 2: PayPal Escrow Lock
                        </div>
                        <div className="p-5 rounded-xl bg-white border border-border text-center space-y-3 shadow-subtle">
                          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 mx-auto flex items-center justify-center">
                            <Lock className="w-6 h-6 animate-pulse" />
                          </div>
                          <div>
                            <span className="text-xs text-content-muted block">PayPal Orders v2 AUTHORIZE</span>
                            <span className="font-serif font-bold text-2xl text-content-primary">$1,250.00 USD</span>
                          </div>
                          <span className="inline-block text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Locked in Custody • Safe from chargebacks
                          </span>
                        </div>
                      </motion.div>
                    )}

                    {activeStoryStep === 2 && (
                      <motion.div
                        key="step-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-3"
                      >
                        <div className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                          Step 3: Isolated AI Verification
                        </div>
                        <div className="p-3.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] space-y-1.5 shadow-subtle">
                          <div className="text-slate-400 text-[10px] pb-1 border-b border-slate-800">
                            sandbox-exec: python runner.py --no-network
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>test_auth_signature: PASSED</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>test_concurrency_race: PASSED</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>prompt_injection_guard: ZERO_LEAKS</span>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-white border border-border flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold block text-content-primary">Judge Verdict: Approved</span>
                            <span className="text-[11px] text-content-muted">Objective criteria met (100%)</span>
                          </div>
                          <div className="w-9 h-9 rounded-full bg-emerald-500 text-white font-serif font-bold flex items-center justify-center text-sm">
                            96%
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeStoryStep === 3 && (
                      <motion.div
                        key="step-3"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-4"
                      >
                        <div className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                          Step 4: PayPal Payout Captured
                        </div>
                        <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white mx-auto flex items-center justify-center shadow-subtle">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-xs text-emerald-700 block font-medium">Funds Released to Freelancer</span>
                            <span className="font-serif font-bold text-2xl text-emerald-950">$625.00 USD</span>
                          </div>
                          <span className="inline-block text-[11px] font-mono text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                            Capture ID: PAYID-M1-VERIFIED
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Progress Indicators */}
                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-border">
                  {[0, 1, 2, 3].map((step) => (
                    <button
                      key={step}
                      onClick={() => setActiveStoryStep(step)}
                      className={`h-1.5 rounded-full transition-all ${
                        activeStoryStep === step ? "bg-emerald-600" : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 2: HOW IT WORKS (PINNED SCROLL TIMELINE) */}
      <section id="how-it-works" className="py-20 bg-surface-subtle border-b border-border">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 space-y-12">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block mb-2">
              End-to-End Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-content-primary">
              Engineered for zero trust and complete clarity.
            </h2>
            <p className="text-content-secondary text-sm sm:text-base mt-2">
              Traditional freelancing relies on blind trust. TrustPay pairs autonomous multi-agent bargaining with cryptographic PayPal holds and automated verification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {storySteps.map((step, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white border border-border space-y-4 hover:shadow-elevated transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-subtle border border-border flex items-center justify-center text-xs font-serif font-bold text-primary">
                    0{idx + 1}
                  </div>
                  <h3 className="font-serif font-bold text-base text-content-primary">
                    {step.title.split(". ")[1]}
                  </h3>
                  <p className="text-xs text-content-secondary leading-relaxed">
                    {step.desc}
                  </p>
                </div>
                <div>
                  <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-surface-subtle text-content-primary border border-border">
                    {step.badge}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: TWO AGENTS, ONE FAIR PRICE */}
      <section id="security" className="py-20 bg-white border-b border-border">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">
                Bilateral Bargaining
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-content-primary leading-tight">
                Two autonomous agents. One mathematically fair price.
              </h2>
              <p className="text-sm sm:text-base text-content-secondary leading-relaxed">
                Both parties set private parameters. The client sets a private maximum budget ceiling; the freelancer sets a private minimum floor. Agents negotiate 3 to 6 rounds without ever leaking their limits.
              </p>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-subtle border border-border">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <span className="font-semibold text-content-primary block">Private Reservation Protection</span>
                    <span className="text-content-secondary">Limits are never serialized over the wire or passed to opposing prompts.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-subtle border border-border">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <span className="font-semibold text-content-primary block">Human Oversight Step</span>
                    <span className="text-content-secondary">Both parties inspect the final contract and can Accept, Reject, or Counter (max 2).</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="p-6 rounded-2xl bg-surface-subtle border border-border space-y-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-content-primary">Price Convergence Trajectory</span>
                  <span className="text-[11px] text-emerald-700 font-mono font-medium">Over 4 Rounds</span>
                </div>

                {/* Graph mockup */}
                <div className="space-y-3">
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-[11px] text-content-muted">
                      <span>Round 1: Initial Quotes</span>
                      <span>$1,400 (Client) / $1,050 (Worker)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
                      <div className="bg-primary w-[35%]" />
                      <div className="bg-emerald-600 w-[20%]" />
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-[11px] text-content-muted">
                      <span>Round 2: Scope & Milestone Trade</span>
                      <span>$1,300 (Client) / $1,150 (Worker)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
                      <div className="bg-primary w-[45%]" />
                      <div className="bg-emerald-600 w-[15%]" />
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-[11px] text-content-muted">
                      <span>Round 3: Final Consensus</span>
                      <span className="font-bold text-emerald-700">$1,250.00 USD (Agreed)</span>
                    </div>
                    <div className="h-2 w-full bg-emerald-600 rounded-full" />
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-border text-xs flex items-center justify-between">
                  <span className="text-content-secondary">Agreed Escrow Value:</span>
                  <span className="font-serif font-bold text-base text-content-primary">$1,250.00 USD</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 4: BUILT FOR BOTH SIDES */}
      <section className="py-20 bg-surface-subtle border-b border-border">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-3xl font-serif font-bold text-content-primary">
              Two distinct, role-tailored portals.
            </h2>
            <p className="text-content-secondary text-sm">
              Each side operates in its own dedicated space with complete data isolation and purpose-built tools.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Client Portal Card */}
            <div className="p-8 rounded-2xl bg-white border border-border shadow-soft hover:shadow-elevated transition-all space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-xl font-serif font-bold text-content-primary">
                  I’m Hiring (Client Portal)
                </h3>
                <p className="text-xs text-content-secondary leading-relaxed">
                  Post freelance projects with private max budgets. Review candidates, watch AI agents negotiate scope, authorize PayPal holds with one click, and inspect automated milestone test reports.
                </p>
                <ul className="text-xs text-content-secondary space-y-2 pt-2">
                  <li className="flex items-center gap-2">✓ 3-Step project setup wizard</li>
                  <li className="flex items-center gap-2">✓ Multi-applicant negotiation threads</li>
                  <li className="flex items-center gap-2">✓ PayPal Orders v2 escrow holding</li>
                </ul>
              </div>

              <Link href="/client">
                <Button size="md" className="w-full">
                  <span>Enter Client Portal</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>

            {/* Freelancer Portal Card */}
            <div className="p-8 rounded-2xl bg-white border border-border shadow-soft hover:shadow-elevated transition-all space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-surface-subtle text-primary border border-border flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-emerald-700" />
                </div>
                <h3 className="text-xl font-serif font-bold text-content-primary">
                  I’m a Freelancer
                </h3>
                <p className="text-xs text-content-secondary leading-relaxed">
                  Browse opportunities with guaranteed escrow budgets. Set your private rate floor and technical brief, upload deliverables to the automated verification sandbox, and receive instant payouts.
                </p>
                <ul className="text-xs text-content-secondary space-y-2 pt-2">
                  <li className="flex items-center gap-2">✓ Agent-backed rate advocacy</li>
                  <li className="flex items-center gap-2">✓ Drag & drop deliverable dropzone</li>
                  <li className="flex items-center gap-2">✓ Guaranteed payouts on passing checks</li>
                </ul>
              </div>

              <Link href="/freelancer">
                <Button variant="outline" size="md" className="w-full">
                  <span>Enter Freelancer Portal</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: FAQ ACCORDION */}
      <section id="faq" className="py-20 bg-white border-b border-border">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-serif font-bold text-content-primary">
              Frequently Answered Questions
            </h2>
            <p className="text-content-secondary text-sm">
              Clear, transparent details about our PayPal integration and AI verification pipeline.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "How does PayPal escrow work in TrustPay?",
                a: "TrustPay uses PayPal Orders v2 with intent=AUTHORIZE. Funds are verified and held by PayPal up front, but not transferred until the AI Judge confirms the deliverables meet acceptance criteria.",
              },
              {
                q: "Are the client's budget and freelancer's minimum price revealed?",
                a: "Never. The client's max budget and freelancer's min floor are strictly private reservation limits. Agents negotiate within these bounds, and regex leak scanners strip or regenerate any response mentioning them.",
              },
              {
                q: "What happens if a deliverable fails verification?",
                a: "The freelancer receives a detailed feedback breakdown per criterion and can fix & resubmit. If a disagreement persists, either party can file a dispute for AI arbitration or human review.",
              },
              {
                q: "Is this a live demo or simulated sandbox?",
                a: "Both! TrustPay supports live PayPal sandbox orders and live Groq LLM inference, with deterministic fallbacks when offline.",
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="border border-border rounded-xl bg-surface-subtle overflow-hidden"
              >
                <button
                  onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between text-sm font-semibold text-content-primary hover:bg-slate-100 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-content-secondary transition-transform ${
                      faqOpen === idx ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {faqOpen === idx && (
                  <div className="p-4 pt-1 text-xs text-content-secondary border-t border-border bg-white leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white py-12 border-t border-border">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-content-secondary">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-white">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="font-serif font-bold text-content-primary text-sm">TrustPay</span>
            <span className="text-content-muted">• PayPal AI Escrow Architecture</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/client" className="hover:text-content-primary transition-colors">
              Client Portal
            </Link>
            <Link href="/freelancer" className="hover:text-content-primary transition-colors">
              Freelancer Portal
            </Link>
            <Link href="/demo" className="hover:text-content-primary transition-colors">
              Demo Hub
            </Link>
          </div>

          <span className="text-content-muted">
            PayPal Sandbox & AI Testing Harness
          </span>
        </div>
      </footer>
    </div>
  );
}
