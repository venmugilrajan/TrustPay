import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
}

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth,
  size,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const widthKey = size || maxWidth || "md";
  const maxWidthStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-content-primary/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className={`w-full ${maxWidthStyles[widthKey] || "max-w-lg"} max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col bg-surface rounded-card border border-border-strong shadow-elevated overflow-hidden my-auto`}
        role="dialog"
        aria-modal="true"
      >
        <div className="px-6 pt-5 pb-3 border-b border-border-subtle shrink-0 flex items-start justify-between bg-surface">
          <div className="pr-4">
            <h3 className="text-base font-bold font-serif text-content-primary">
              {title}
            </h3>
            {description && (
              <p className="mt-1 text-xs text-content-secondary leading-relaxed">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-content-muted hover:text-content-primary hover:bg-surface-subtle rounded-lg transition-colors -mr-1 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 flex-1 min-h-0 overflow-y-auto">
          {children}
        </div>

        {footer && (
          <div className="px-6 py-3.5 border-t border-border-subtle shrink-0 bg-surface/95 backdrop-blur-sm z-10 flex items-center justify-between">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
