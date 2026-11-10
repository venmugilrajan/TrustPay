"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  PlusCircle,
  CreditCard,
  Scale,
  Menu,
  X,
  UserCheck,
} from "lucide-react";
import AccountSwitcher from "@/components/ui/AccountSwitcher";
import { ensureDemoUser, getStoredUser } from "@/lib/api";
import AuroraBackground from "@/components/glass/AuroraBackground";
import { ThemeToggle } from "@/components/glass/GlassNav";
import HowItWorksDrawer from "@/components/glass/HowItWorksDrawer";
import ClientLoading from "./loading";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/client", icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: "Post a Project", href: "/client/jobs/new", icon: <PlusCircle className="w-4 h-4" /> },
  { label: "Payments", href: "/client/payments", icon: <CreditCard className="w-4 h-4" /> },
  { label: "Disputes", href: "/client/disputes", icon: <Scale className="w-4 h-4" /> },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  useEffect(() => {
    setNavigatingTo(null);
  }, [pathname]);

  useEffect(() => {
    NAV_ITEMS.forEach((item) => {
      try { router.prefetch(item.href); } catch {}
    });
  }, [router]);

  useEffect(() => {
    const current = getStoredUser("client")?.id || "client_maya";
    ensureDemoUser(current, "client").catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-content-primary flex flex-col relative">
      <AuroraBackground />

      {/* Top Glass Navigation Bar */}
      <header className="glass-nav sticky top-0 z-40 relative">
        {navigatingTo && (
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-accent via-accent-emerald to-accent animate-pulse z-50" />
        )}

        <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-subtle group-hover:scale-105 transition-transform">
                <Shield className="w-4 h-4" />
              </div>
              <span className="font-serif font-bold text-lg text-content-primary tracking-tight">
                TrustPay
              </span>
              <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-accent/10 text-accent border border-accent/20 flex items-center gap-1">
                <UserCheck className="w-3 h-3" />
                <span>Client</span>
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const isCurrent =
                  item.href === "/client"
                    ? pathname === "/client"
                    : pathname.startsWith(item.href);
                const isActive = navigatingTo ? navigatingTo === item.href : isCurrent;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    onClick={() => {
                      if (!isCurrent) setNavigatingTo(item.href);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer",
                      isActive
                        ? "nav-pill-active shadow-subtle"
                        : "text-content-secondary hover:text-content-primary hover:bg-border/60"
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2.5">
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-subtle text-[11px] font-medium text-content-muted">
              <span className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse" />
              <span>PayPal Sandbox Connected</span>
            </div>

            <HowItWorksDrawer role="client" />
            <ThemeToggle />
            <AccountSwitcher currentRole="client" />

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-9 h-9 rounded-full flex items-center justify-center text-content-secondary hover:text-content-primary hover:bg-border transition-colors"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-surface/95 backdrop-blur-xl px-4 py-3 space-y-1 animate-fade-in-up">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/client"
                  ? pathname === "/client"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent/15 text-accent font-semibold"
                      : "text-content-secondary hover:text-content-primary hover:bg-border/50"
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-wide w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 content-layer">
        {navigatingTo && navigatingTo !== pathname ? <ClientLoading /> : children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border glass-subtle py-6 text-xs text-content-muted text-center content-layer">
        <div className="max-w-wide mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>TrustPay Client Workspace · Protected by PayPal Authorizations & Autonomous AI Escrow</span>
          <span>PayPal Sandbox Environment · Verified Isolated Container Execution</span>
        </div>
      </footer>
    </div>
  );
}
