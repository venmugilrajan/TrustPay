import React, { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check, Terminal } from "lucide-react";

export interface CodeBlockProps {
  title?: string;
  code: string;
  defaultExpanded?: boolean;
  className?: string;
}

export default function CodeBlock({
  title = "Sandbox Test Output",
  code,
  defaultExpanded = false,
  className = "",
}: CodeBlockProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-btn border border-border-subtle overflow-hidden bg-slate-900 text-slate-100 ${className}`}>
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between px-3.5 py-2.5 bg-[#1B1611] border-b border-[#352D24] cursor-pointer select-none hover:bg-[#251F18] transition-colors"
      >
        <div className="flex items-center gap-2 text-xs font-medium">
          <Terminal className="w-3.5 h-3.5 text-accent" />
          <span>{title}</span>
          <span className="text-[10px] text-content-muted">
            ({code.split("\n").length} lines)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 text-content-muted hover:text-white rounded hover:bg-[#352D24] transition-colors"
            title="Copy output"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-content-muted" />
          ) : (
            <ChevronRight className="w-4 h-4 text-content-muted" />
          )}
        </div>
      </div>

      {expanded && (
        <pre className="p-3.5 font-mono text-xs overflow-x-auto leading-relaxed max-h-72">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}

