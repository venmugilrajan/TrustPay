import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export default function Input({
  label,
  helperText,
  error,
  leftIcon,
  rightIcon,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-content-secondary">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 text-content-muted pointer-events-none flex items-center">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={`w-full bg-surface text-content-primary placeholder:text-content-muted text-sm rounded-btn border ${
            error ? "border-danger focus:border-danger focus:ring-danger" : "border-border-subtle focus:border-primary focus:ring-primary"
          } px-3 py-2 transition-colors outline-none focus:ring-1 ${
            leftIcon ? "pl-9" : ""
          } ${rightIcon ? "pr-9" : ""} ${className}`}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 text-content-muted flex items-center">
            {rightIcon}
          </span>
        )}
      </div>
      {error ? (
        <p className="text-xs text-danger font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-content-muted">{helperText}</p>
      ) : null}
    </div>
  );
}

