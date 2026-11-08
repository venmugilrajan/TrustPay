import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "surface" | "subtle" | "outline";
  padding?: "none" | "sm" | "md" | "lg";
}

export default function Card({
  children,
  variant = "surface",
  padding = "md",
  className = "",
  ...props
}: CardProps) {
  const variantStyles = {
    surface: "bg-surface border border-border-subtle shadow-soft",
    subtle: "bg-surface-subtle border border-border-subtle",
    outline: "bg-transparent border border-border-subtle",
  };

  const paddingStyles = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      className={`rounded-card transition-all ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
