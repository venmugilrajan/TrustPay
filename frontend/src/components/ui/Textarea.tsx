import React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export default React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({
  label,
  helperText,
  error,
  className = "",
  id,
  rows = 4,
  ...props
}, ref) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-content-secondary">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        className={`w-full bg-surface text-content-primary placeholder:text-content-muted text-sm rounded-btn border ${
          error ? "border-danger focus:border-danger focus:ring-danger" : "border-border-subtle focus:border-primary focus:ring-primary"
        } px-3 py-2.5 transition-colors outline-none focus:ring-1 resize-y ${className}`}
        {...props}
      />
      {error ? (
        <p className="text-xs text-danger font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-content-muted">{helperText}</p>
      ) : null}
    </div>
  );
});

