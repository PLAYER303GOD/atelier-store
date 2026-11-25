"use client";

import { type ComponentProps, type ReactNode, useId } from "react";

import { cn } from "@/lib/cn";

type TextAreaProps = Omit<ComponentProps<"textarea">, "id"> & {
  label: string;
  hint?: ReactNode;
  error?: string;
};

/** Multi-line sibling of TextField: same label, underline, error and hint behaviour. */
export function TextArea({ label, hint, error, className, rows = 4, ...props }: TextAreaProps) {
  const id = useId();
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-label font-medium uppercase">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "mt-2 block w-full resize-y border-b bg-transparent py-3 text-body outline-none transition-colors duration-200",
          "placeholder:text-subtle focus-visible:border-ink",
          error ? "border-error" : "border-line hover:border-muted",
        )}
        {...props}
      />
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
