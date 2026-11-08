import React from "react";
import { HelpCircle } from "lucide-react";
import Card from "./Card";

export interface NextStepCardProps {
  stepText: string;
  className?: string;
}

export default function NextStepCard({ stepText, className = "" }: NextStepCardProps) {
  return (
    <Card padding="sm" className={`bg-primary-subtle/50 border-[#C5D7CE] ${className}`}>
      <div className="flex items-start gap-3">
        <HelpCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="text-xs font-bold text-primary uppercase tracking-wider block">
            What happens next?
          </span>
          <p className="mt-0.5 text-xs text-content-primary leading-relaxed font-medium">
            {stepText}
          </p>
        </div>
      </div>
    </Card>
  );
}
