"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  variant?: "subtle" | "default" | "strong";
  className?: string;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  onClick?: () => void;
  as?: React.ElementType;
}

export default function GlassCard({
  children,
  variant = "default",
  className = "",
  hover = false,
  padding = "md",
  onClick,
  as: Tag = "div",
}: GlassCardProps) {
  const glassClass = {
    subtle: "glass-subtle",
    default: "glass",
    strong: "glass-strong",
  }[variant];

  const paddingClass = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  }[padding];

  return (
    <Tag
      className={cn(
        glassClass,
        paddingClass,
        hover &&
          "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glass-strong cursor-pointer",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <div className="relative z-10">{children}</div>
    </Tag>
  );
}

