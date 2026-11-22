"use client";

import { type ComponentProps, type ReactNode, useId } from "react";

import { cn } from "@/lib/cn";

type TextFieldProps = Omit<ComponentProps<"input">, "id"> & {
  label: string;
  /** Persistent help under the field (e.g. password rules); linked with aria-describedby. */
  hint?: ReactNode;
  /** Field-level error; marks the input invalid and is read out with it. Replaces nothing: the hint stays. */
  error?: string;
  /** Extra line under the field, e.g. a Caps Lock warning; also linked with aria-describedby. */
  notice?: ReactNode;
  /** An icon button inside the field's right edge (e.g. show/hide password). */
  action?: ReactNode;
};

/**
 * Label + underlined input, matching the search box: a hairline that darkens on hover/focus
 * and turns red when invalid. Always pass `name`, `type` and `autoComplete`. Validation is
 * the caller's job (forms use `noValidate` and pass `error`), so messages match the site's
 * voice instead of the browser's.
 */
export function TextField({ label, hint, error, notice, action, className, ref, ...props }: TextFieldProps) {
  const id = useId();
  const describedBy =
    [error && `${id}-error`, notice && `${id}-notice`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-label font-medium uppercase">
        {label}
      </label>
      <div className="relative mt-2">
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-12 w-full border-b bg-transparent text-body outline-none transition-colors duration-200",
            "placeholder:text-subtle focus-visible:border-ink disabled:text-muted",
            error ? "border-error" : "border-line hover:border-muted",
            action ? "pr-12" : undefined,
          )}
          {...props}
        />
        {action && <div className="absolute inset-y-0 right-0 flex items-center">{action}</div>}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-2 animate-rise text-body-sm text-error [animation-duration:0.35s]">
          {error}
        </p>
      )}
      {notice && (
        <p id={`${id}-notice`} className="mt-2 text-body-sm text-warning">
          {notice}
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
