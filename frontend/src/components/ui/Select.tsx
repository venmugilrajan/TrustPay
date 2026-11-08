import React from "react";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options: SelectOption[];
}

export default function Select({
  label,
  helperText,
  error,
  options,
  className = "",
  id,
  ...props
}: SelectProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-content-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={inputId}
          className={`w-full appearance-none bg-surface text-content-primary text-sm rounded-btn border ${
            error ? "border-danger focus:border-danger focus:ring-danger" : "border-border-subtle focus:border-primary focus:ring-primary"
          } px-3 py-2 pr-9 transition-colors outline-none focus:ring-1 cursor-pointer ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none">
          <ChevronDown className="w-4 h-4" />
        </span>
      </div>
      {error ? (
        <p className="text-xs text-danger font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-content-muted">{helperText}</p>
      ) : null}
    </div>
  );
}

