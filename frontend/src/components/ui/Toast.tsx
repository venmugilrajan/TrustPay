import React from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

export interface ToastProps {
  message: string;
  type?: "success" | "warning" | "error" | "info";
  onClose?: () => void;
  className?: string;
}

export default function Toast({
  message,
  type = "info",
  onClose,
  className = "",
}: ToastProps) {
  const typeStyles = {
    success: "bg-success-bg border-success-border text-success",
    warning: "bg-warning-bg border-warning-border text-warning",
    error: "bg-danger-bg border-danger-border text-danger",
    info: "bg-info-bg border-info-border text-info",
  };

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 shrink-0" />,
    error: <AlertTriangle className="w-4 h-4 shrink-0" />,
    info: <Info className="w-4 h-4 shrink-0" />,
  };

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-btn border shadow-elevated text-sm ${typeStyles[type]} ${className}`}
    >
      {icons[type]}
      <span className="font-medium text-content-primary">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 hover:opacity-75 transition-opacity ml-2"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

