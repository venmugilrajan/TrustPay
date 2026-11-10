"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "glass" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

export default function GlassButton({
  children,
  variant = "glass",
  size = "md",
  loading = false,
  icon,
  className = "",
  disabled,
  ...props
}: GlassButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-all duration-200 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeStyles = {
    sm: "text-xs px-3.5 py-1.5 gap-1.5 rounded-pill",
    md: "text-sm px-5 py-2.5 gap-2 rounded-pill",
    lg: "text-base px-6 py-3 gap-2.5 rounded-pill font-semibold",
  }[size];

  const variantStyles = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary-hover shadow-soft border border-primary",
    secondary:
      "bg-surface text-content-primary hover:bg-border border border-border shadow-subtle",
    glass:
      "glass-button text-content-primary",
    ghost:
      "bg-transparent text-content-secondary hover:text-content-primary hover:bg-border/60",
    danger:
      "bg-danger text-white hover:bg-danger/90 border border-danger shadow-subtle",
  }[variant];

  return (
    <button
      className={cn(baseStyles, sizeStyles, variantStyles, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin text-current" /> : icon}
      <span>{children}</span>
    </button>
  );
}

