"use client";

import Link from "next/link";
import { Shield, Sparkles, Scale, Lock, CheckCircle2, ArrowRight, Zap, RefreshCw, Cpu } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Background radial gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-blue-600/15 via-teal-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-sky-400 text-xs font-semibold mb-8 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          <span>PayPal AI Hackathon 2026</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight">
          AI-Negotiated Escrow. <br />
          <span className="bg-gradient-to-r from-blue-600 via-sky-500 to-teal-400 bg-clip-text text-transparent">
            Conditional on Verified Work.
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
          Two autonomous AI agents negotiate deal scope and milestones. PayPal securely holds the authorized funds. An AI Judge tests deliverables and unlocks payments milestone by milestone.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-[#003087] via-[#0070BA] to-sky-500 hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98] transition flex items-center justify-center space-x-2"
          >
            <span>Explore Live Demo</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/jobs/new"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition flex items-center justify-center space-x-2"
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Post a Job</span>
          </Link>
        </div>

        {/* Stats Strip */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto border-t border-slate-200 dark:border-slate-800/80 pt-8">
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-sky-400 font-mono">AUTHORIZE</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">PayPal Orders v2 Escrow</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-teal-600 dark:text-teal-400 font-mono">&lt; 30s Sandbox</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Isolated Test Verification</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">Min. 3 Rounds</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">AI Negotiation Consensus</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">Groq &amp; Claude</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Pydantic JSON Reasoning</div>
          </div>
        </div>
      </section>

      {/* The Problem & Solution */}
      <section className="py-16 bg-slate-100/60 dark:bg-[#0f172a]/40 border-y border-slate-200 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-sky-400">The Problem & Solution</h2>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Why Freelance Contracts Break Down</p>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              Clients fear paying upfront for incomplete code. Freelancers and students fear delivering work without guarantee of payout. TrustPay eliminates counterparty risk with autonomous verification.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-sky-400 mb-4">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">1. AI Negotiation</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Client Agent (cost & scope protector) and Freelancer Agent (fair timeline advocate) negotiate alternating rounds to construct a deterministic, milestone-based smart contract.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-4">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">2. PayPal Authorization Escrow</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                PayPal Orders v2 holds the total contract amount with <code className="text-xs text-sky-400">intent: AUTHORIZE</code>. Funds are guaranteed in escrow without taking premature custody.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                <Scale className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">3. AI Judge & Captures</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Code runs in an isolated container sandbox against acceptance criteria. Pass (&ge; 85%) triggers full capture; partial triggers proportional payout; fail allows revision.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Agent Roles Section */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-sky-400">Autonomous Architecture</h2>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Four Specialized AI Agents</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
            <div className="text-xs font-mono font-bold text-blue-500">AGENT 01</div>
            <h4 className="mt-1 font-bold text-slate-900 dark:text-white">Client Agent</h4>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Represents buyer. Strives for budget optimization, clear testable criteria, and progressive deliverables.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
            <div className="text-xs font-mono font-bold text-emerald-500">AGENT 02</div>
            <h4 className="mt-1 font-bold text-slate-900 dark:text-white">Freelancer Agent</h4>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Represents worker. Fights for fair compensation, realistic timelines, and scope creep prevention.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
            <div className="text-xs font-mono font-bold text-amber-500">AGENT 03</div>
            <h4 className="mt-1 font-bold text-slate-900 dark:text-white">Judge Agent</h4>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Impartial validator. Executes code in sandbox, scores per criterion, and triggers PayPal captures.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
            <div className="text-xs font-mono font-bold text-purple-500">AGENT 04</div>
            <h4 className="mt-1 font-bold text-slate-900 dark:text-white">Dispute Agent</h4>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Final arbitrator. Weighs evidence and arguments to issue binding refunds or payouts via PayPal.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
