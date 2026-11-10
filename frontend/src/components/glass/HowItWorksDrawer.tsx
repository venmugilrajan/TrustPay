"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck, Scale, CheckCircle2, Lock, ArrowRight, HelpCircle } from "lucide-react";
import GlassButton from "./GlassButton";

interface HowItWorksDrawerProps {
  role?: "client" | "freelancer";
}

export default function HowItWorksDrawer({ role = "client" }: HowItWorksDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-content-secondary hover:text-content-primary px-2.5 py-1 rounded-full border border-border hover:bg-border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        aria-label="How TrustPay Works"
      >
        <HelpCircle className="w-3.5 h-3.5 text-accent" />
        <span>How it works</span>
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[250] flex justify-end" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Glass Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              className="relative w-full max-w-md h-full glass-strong p-6 sm:p-8 flex flex-col justify-between overflow-y-auto z-10 border-l border-border"
            >
              <div>
                <div className="flex items-center justify-between pb-6 border-b border-border">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-accent-emerald" />
                    <h2 className="text-lg font-bold text-content-primary">
                      How TrustPay Works
                    </h2>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-content-muted hover:text-content-primary hover:bg-border transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-6 space-y-6">
                  {/* Step 1 */}
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-2xl bg-accent/15 text-accent flex items-center justify-center font-bold text-sm flex-shrink-0">
                      1
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-content-primary">
                        Autonomous AI Negotiation
                      </h3>
                      <p className="text-xs text-content-secondary mt-1 leading-relaxed">
                        Your private AI agent negotiates milestones, prices, and acceptance criteria with the counterparty in seconds, keeping budgets confidential.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-2xl bg-accent-emerald/15 text-accent-emerald flex items-center justify-center font-bold text-sm flex-shrink-0">
                      2
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-content-primary">
                        Safe Hold with PayPal
                      </h3>
                      <p className="text-xs text-content-secondary mt-1 leading-relaxed">
                        Funds are safely authorized by PayPal. Money stays protected in safe hold until work is verified. Neither party risks unpaid effort or unfulfilled work.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-2xl bg-warning/15 text-warning flex items-center justify-center font-bold text-sm flex-shrink-0">
                      3
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-content-primary">
                        Automated AI Work Checking
                      </h3>
                      <p className="text-xs text-content-secondary mt-1 leading-relaxed">
                        When code is submitted, an isolated test sandbox executes test suites against agreed criteria. If tests pass 100%, payout releases immediately.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                      4
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-content-primary">
                        Neutral AI Dispute Protection
                      </h3>
                      <p className="text-xs text-content-secondary mt-1 leading-relaxed">
                        In rare cases of disagreement, an AI Dispute Arbitrator evaluates raw git commits, test outputs, and specifications to issue a fair, binding resolution.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-border">
                <GlassButton
                  variant="primary"
                  className="w-full"
                  onClick={() => setOpen(false)}
                >
                  Got it, close
                </GlassButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

