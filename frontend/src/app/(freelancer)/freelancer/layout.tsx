"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  Search,
  Briefcase,
  DollarSign,
  Scale,
  Menu,
  X,
  Code2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { loginDemoUser, getStoredToken } from "@/lib/api";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/freelancer", icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: "Opportunities", href: "/freelancer/opportunities", icon: <Search className="w-4 h-4" /> },
  { label: "My Work", href: "/freelancer/work", icon: <Briefcase className="w-4 h-4" /> },
  { label: "Earnings", href: "/freelancer/earnings", icon: <DollarSign className="w-4 h-4" /> },
  { label: "Disputes", href: "/freelancer/disputes", icon: <Scale className="w-4 h-4" /> },
];

export default function FreelancerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Ensure Freelancer JWT token is set for API calls
    loginDemoUser("freelancer_default", "freelancer").catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-border-subtle bg-surface sticky top-0 z-30 shadow-soft">
        <div className="max-w-content mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-btn bg-accent text-surface flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <span className="font-serif font-bold text-lg text-content-primary">
                TrustPay
              </span>
              <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-accent-subtle text-accent border border-[#ECD1C7] flex items-center gap-1">
                <Code2 className="w-3 h-3" />
                <span>Freelancer</span>
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/freelancer"
                    ? pathname === "/freelancer"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-btn text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-content-secondary hover:text-content-primary hover:bg-cream-100"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-subtle text-content-muted border border-border-subtle text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              <span>Escrow Protected</span>
            </span>

            <Link href="/client" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Switch to Client
              </Button>
            </Link>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-content-secondary hover:text-content-primary rounded-btn"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border-subtle bg-surface px-4 py-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/freelancer"
                  ? pathname === "/freelancer"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-btn text-sm font-medium ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-content-secondary hover:bg-cream-100"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <div className="pt-2 border-t border-border-subtle flex flex-col gap-2">
              <Link
                href="/client"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs text-primary font-medium px-3 py-2"
              >
                Switch to Client Portal →
              </Link>
              <Link
                href="/demo"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs text-content-muted px-3 py-1"
              >
                Demo Hub & Sandbox Tools
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-content w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle bg-surface/50 py-4 mt-auto">
        <div className="max-w-content mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-content-muted">
          <span>TrustPay Freelancer Portal • Guaranteed Escrow Payouts</span>
          <Link href="/demo" className="hover:text-content-primary underline">
            Demo Tools
          </Link>
        </div>
      </footer>
    </div>
  );
}

