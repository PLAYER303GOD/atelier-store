"use client";

import { type ComponentProps, type ReactNode, useId } from "react";

import { cn } from "@/lib/cn";

type SelectFieldProps = Omit<ComponentProps<"select">, "id"> & {
  label: string;
  hint?: ReactNode;
  error?: string;
};

/** Native <select> styled like TextField (label, underline, chevron, error and hint). */
export function SelectField({ label, hint, error, className, children, ...props }: SelectFieldProps) {
  const id = useId();
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-label font-medium uppercase">
        {label}
      </label>
      <div className="relative mt-2">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-12 w-full appearance-none border-b bg-transparent pr-8 text-body outline-none transition-colors duration-200",
            "focus-visible:border-ink",
            error ? "border-error" : "border-line hover:border-muted",
          )}
          {...props}
        >
          {children}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="pointer-events-none absolute top-1/2 right-1 size-3.5 -translate-y-1/2 text-muted"
        >
          <path d="M3.5 6 8 10.5 12.5 6" fill="none" stroke="currentColor" strokeWidth="1.25" />
        </svg>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-2 animate-rise text-body-sm text-error [animation-duration:0.35s]">
          {error}
        </p>
      )}
      {hint && (
        <div id={`${id}-hint`} className="mt-2 text-body-sm text-muted">
          {hint}
        </div>
      )}
    </div>
  );
}
