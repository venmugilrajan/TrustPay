"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  User,
  ChevronDown,
  LogOut,
  Check,
  Building2,
  Code2,
} from "lucide-react";
import {
  DEMO_USERS,
  DemoUser,
  getStoredUser,
  loginDemoUser,
  clearUserSession,
  invalidateApiCache,
} from "@/lib/api";
import GlassModal from "@/components/glass/GlassModal";
import GlassButton from "@/components/glass/GlassButton";

interface AccountSwitcherProps {
  currentRole: "client" | "freelancer";
}

export default function AccountSwitcher({ currentRole }: AccountSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser(currentRole);
    if (user) {
      setCurrentUser(user);
    } else {
      const defaultUser =
        currentRole === "client" ? DEMO_USERS[0] : DEMO_USERS[2];
      setCurrentUser(defaultUser);
    }
  }, [currentRole, pathname]);

  const handleSelectUser = async (user: DemoUser) => {
    try {
      setLoadingId(user.id);
      await loginDemoUser(user.id, user.role);
      setCurrentUser(user);
      setIsOpen(false);
      invalidateApiCache();
      if (user.role === "client" && !pathname.startsWith("/client")) {
        router.push("/client");
      } else if (user.role === "freelancer" && !pathname.startsWith("/freelancer")) {
        router.push("/freelancer");
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error("Account switch failed:", err);
    } finally {
      setLoadingId(null);
    }
  };

  const handleSignOut = () => {
    clearUserSession();
    setIsOpen(false);
    router.push("/");
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full glass hover:border-accent/40 transition-all text-xs text-content-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        title="Switch Account / Sign In"
        aria-label="Switch Account"
      >
        <div className="w-5 h-5 rounded-full bg-accent/15 text-accent flex items-center justify-center font-bold text-[10px]">
          {currentUser ? currentUser.name[0] : <User className="w-3 h-3" />}
        </div>
        <div className="text-left hidden sm:block">
          <span className="font-semibold text-xs block leading-tight">
            {currentUser?.name || "Demo User"}
          </span>
          <span className="text-[10px] text-content-muted capitalize block">
            {currentUser?.role || currentRole}
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-content-muted ml-0.5" />
      </button>

      <GlassModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Switch Demo Account"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-content-secondary leading-relaxed">
            Select a verified demo persona to experience TrustPay with role-isolated credentials, cryptographic JWT tokens, and private data boundaries.
          </p>

          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-content-muted uppercase tracking-wider block">
              Client Accounts (Project Funders)
            </span>
            {DEMO_USERS.filter((u) => u.role === "client").map((user) => {
              const isSelected = currentUser?.id === user.id;
              return (
                <button
                  key={user.id}
                  disabled={loadingId !== null}
                  onClick={() => handleSelectUser(user)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? "border-accent bg-accent/10 shadow-subtle"
                      : "border-border hover:border-accent/40 bg-surface/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/15 text-accent flex items-center justify-center font-semibold text-sm">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-content-primary">
                          {user.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface text-content-muted border border-border">
                          Client
                        </span>
                      </div>
                      <span className="text-[11px] text-content-secondary block">
                        {user.title} · {user.email}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-semibold text-content-muted uppercase tracking-wider block">
              Freelancer Accounts (Contractors)
            </span>
            {DEMO_USERS.filter((u) => u.role === "freelancer").map((user) => {
              const isSelected = currentUser?.id === user.id;
              return (
                <button
                  key={user.id}
                  disabled={loadingId !== null}
                  onClick={() => handleSelectUser(user)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? "border-accent-emerald bg-accent-emerald/10 shadow-subtle"
                      : "border-border hover:border-accent-emerald/40 bg-surface/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent-emerald/15 text-accent-emerald flex items-center justify-center font-semibold text-sm">
                      <Code2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-content-primary">
                          {user.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface text-content-muted border border-border">
                          Freelancer
                        </span>
                      </div>
                      <span className="text-[11px] text-content-secondary block">
                        {user.title} · {user.email}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-accent-emerald text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between">
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={handleSignOut}
              className="text-danger hover:text-danger hover:border-danger/40"
              icon={<LogOut className="w-3.5 h-3.5" />}
            >
              Sign Out
            </GlassButton>
            <GlassButton variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              Close
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </>
  );
}
