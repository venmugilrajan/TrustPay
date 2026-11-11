"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlassModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function GlassModal({
  open,
  onClose,
  title,
  children,
  size = "md",
  className = "",
}: GlassModalProps) {
  const sizeClass = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
  }[size];

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 overflow-y-auto" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={cn(
              "relative w-full max-h-[calc(100vh-3rem)] flex flex-col glass-strong p-6 z-10 my-auto shadow-2xl",
              sizeClass,
              className
            )}
          >
            {title && (
              <div className="flex items-center justify-between pb-3 border-b border-border/40 shrink-0 mb-4">
                <h2 className="text-lg font-semibold text-content-primary">{title}</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-content-muted hover:text-content-primary hover:bg-border transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="relative z-10 overflow-y-auto pr-1 -mr-1">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

