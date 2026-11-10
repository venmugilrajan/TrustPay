"use client";

import React, { useState, useRef, useEffect } from "react";
import { HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface InfoPopoverProps {
  term: string;
  explanation: string;
  className?: string;
}

export default function InfoPopover({ term, explanation, className = "" }: InfoPopoverProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div className={cn("relative inline-flex items-center", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onMouseEnter={() => setOpen(true)}
        className="text-content-muted hover:text-content-primary transition-colors p-0.5 rounded-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        aria-label={`Learn more about ${term}`}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 glass-strong p-3.5 shadow-glass-strong text-left"
          >
            <div className="text-xs font-semibold text-content-primary mb-1">{term}</div>
            <div className="text-xs text-content-secondary leading-relaxed">{explanation}</div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 rotate-45 bg-surface border-r border-b border-border" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

