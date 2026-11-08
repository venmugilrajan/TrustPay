import React from "react";
import { DollarSign, CheckCircle2 } from "lucide-react";

export interface ChatBubbleProps {
  sender: "client" | "freelancer";
  agentName: string;
  roundNumber: number;
  message: string;
  proposedPrice?: number | null;
  priceChangeReason?: string | null;
  agreed?: boolean;
}

export default function ChatBubble({
  sender,
  agentName,
  roundNumber,
  message,
  proposedPrice,
  priceChangeReason,
  agreed,
}: ChatBubbleProps) {
  const isClient = sender === "client";

  return (
    <div className={`flex flex-col ${isClient ? "items-start" : "items-end"} w-full space-y-1`}>
      <div className="flex items-center gap-2 text-xs text-content-muted px-1">
        <span className="font-semibold text-content-secondary">{agentName}</span>
        <span>• Round {roundNumber} of 6</span>
        {proposedPrice != null && (
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-surface-subtle text-content-primary border border-border-subtle font-medium text-[11px]">
            <DollarSign className="w-3 h-3 text-primary" />
            ${proposedPrice.toFixed(2)} USD
          </span>
        )}
        {agreed && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-bg text-success border border-success-border font-medium text-[11px]">
            <CheckCircle2 className="w-3 h-3" />
            Agreed
          </span>
        )}
      </div>

      <div
        className={`max-w-xl rounded-card p-4 text-sm leading-relaxed border ${
          isClient
            ? "bg-surface text-content-primary border-border-subtle shadow-soft"
            : "bg-surface-subtle text-content-primary border-border-strong shadow-soft"
        }`}
      >
        <p className="whitespace-pre-wrap">{message}</p>

        {priceChangeReason && (
          <div className="mt-3 pt-2.5 border-t border-border-subtle text-xs text-content-secondary italic">
            <span className="font-semibold not-italic text-content-primary">Proposal rationale: </span>
            {priceChangeReason}
          </div>
        )}
      </div>
    </div>
  );
}
