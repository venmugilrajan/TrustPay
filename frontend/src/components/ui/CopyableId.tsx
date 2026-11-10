import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

export interface CopyableIdProps {
  idText?: string;
  id?: string;
  label?: string;
  truncate?: boolean;
  className?: string;
}

export default function CopyableId({
  idText,
  id,
  label,
  truncate = true,
  className = "",
}: CopyableIdProps) {
  const [copied, setCopied] = useState(false);
  const actualText = idText || id || "";

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(actualText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayText =
    truncate && actualText.length > 20
      ? `${actualText.slice(0, 10)}...${actualText.slice(-6)}`
      : actualText;

  return (
    <div
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded bg-surface-subtle border border-border-subtle hover:border-border-strong cursor-pointer text-xs font-mono transition-colors group ${className}`}
      title="Click to copy full ID"
    >
      {label && <span className="text-[11px] font-sans text-content-muted mr-1">{label}:</span>}
      <span className="text-content-primary">{displayText}</span>
      <span className="text-content-muted group-hover:text-content-primary">
        {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
      </span>
    </div>
  );
}
