"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface GlassNavProps {
  logo?: React.ReactNode;
  items: NavItem[];
  rightSlot?: React.ReactNode;
  showThemeToggle?: boolean;
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return <div className={cn("w-9 h-9", className)} />;

  const isDark = resolvedTheme === "dark";
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200",
        "text-content-secondary hover:text-content-primary hover:bg-border",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className
      )}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
            <Sun className="w-4.5 h-4.5" />
          </motion.div>
        ) : (
          <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
            <Moon className="w-4.5 h-4.5" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

export default function GlassNav({ logo, items, rightSlot, showThemeToggle = true }: GlassNavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <>
      <nav className="glass-nav sticky top-0 z-50 w-full">
        <div className="max-w-content mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          {/* Logo */}
          {logo && <div className="flex-shrink-0">{logo}</div>}

          {/* Desktop nav items */}
          <div className="hidden md:flex items-center gap-1 flex-1 mx-4">
            {items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-pill transition-all duration-150",
                    isActive
                      ? "nav-pill-active"
                      : "text-content-secondary hover:text-content-primary hover:bg-border"
                  )}
                >
                  {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Right slot */}
          <div className="flex items-center gap-2 ml-auto">
            {rightSlot}
            {showThemeToggle && <ThemeToggle />}
            {/* Mobile menu toggle */}
            <button
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-full text-content-secondary hover:text-content-primary hover:bg-border transition-colors"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-border overflow-hidden"
            >
              <div className="px-4 py-3 flex flex-col gap-1">
                {items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-150",
                        isActive
                          ? "bg-content-primary text-bg-canvas"
                          : "text-content-secondary hover:text-content-primary hover:bg-border"
                      )}
                    >
                      {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}

