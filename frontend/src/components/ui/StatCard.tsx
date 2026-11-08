import React from "react";
import Card from "./Card";

export interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: string;
  icon?: React.ReactNode;
  className?: string;
}

export default function StatCard({
  label,
  value,
  subtext,
  trend,
  icon,
  className = "",
}: StatCardProps) {
  return (
    <Card className={`flex flex-col justify-between ${className}`} padding="md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-content-secondary uppercase tracking-wider">
          {label}
        </span>
        {icon && <span className="text-content-muted">{icon}</span>}
      </div>

      <div className="mt-3">
        <div className="text-2xl lg:text-3xl font-bold font-serif text-content-primary">
          {value}
        </div>
        {(subtext || trend) && (
          <div className="mt-1 flex items-center gap-2 text-xs text-content-muted">
            {trend && <span className="font-medium text-primary">{trend}</span>}
            {subtext && <span>{subtext}</span>}
          </div>
        )}
      </div>
    </Card>
  );
}

