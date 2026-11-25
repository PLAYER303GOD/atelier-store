"use client";

import { type KeyboardEvent, useId, useRef } from "react";

import { CloseIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { PRODUCT_LIMITS } from "@/lib/admin-validation";

type DetailsFieldProps = {
  /** The details as one newline-separated string (what the form submits as `details`). */
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  readOnly: boolean;
};

/**
 * "Product details" as the list it becomes on the product page: one underlined line per detail
 * (same look as TextField), a quiet remove control on each, and "Add detail". Enter starts the
 * next detail; Backspace in an empty one removes it. Submits the same newline-separated `details`
 * field, so validation and the server action don't change.
 */
export function DetailsField({ value, onChange, onBlur, error, readOnly }: DetailsFieldProps) {
  const id = useId();
  const listRef = useRef<HTMLOListElement>(null);
  const rows = value === "" ? [""] : value.split("\n");
  const full = rows.length >= PRODUCT_LIMITS.detailLines;

  const commit = (next: string[]) => onChange(next.join("\n"));
  const focusRow = (index: number, atEnd = false) =>
    requestAnimationFrame(() => {
      const input = listRef.current?.querySelectorAll("input")[index];
      input?.focus();
      if (atEnd && input) input.setSelectionRange(input.value.length, input.value.length);
    });

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (readOnly) return;
    if (event.key === "Enter") {
      event.preventDefault(); // never submits the whole form from here
      if (full) return;
      commit([...rows.slice(0, index + 1), "", ...rows.slice(index + 1)]);
      focusRow(index + 1);
    } else if (event.key === "Backspace" && rows[index] === "" && rows.length > 1) {
      event.preventDefault();
      commit(rows.filter((_, i) => i !== index));
      focusRow(Math.max(0, index - 1), true);
    }
  }

  return (
    <fieldset aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}>
      <legend className="text-label font-medium uppercase">Product details</legend>
      <input type="hidden" name="details" value={value} />
      <ol ref={listRef} className="mt-2">
        {rows.map((row, index) => (
          // The underline spans the whole row (input + remove), so it ends where every other field's does.
          <li
            key={index}
            className={cn(
              "flex items-center gap-3 border-b transition-colors duration-200 has-[input:focus-visible]:border-ink",
              error ? "border-error" : "border-line hover:border-muted",
            )}
          >
            <input
              type="text"
              value={row}
              readOnly={readOnly}
              maxLength={PRODUCT_LIMITS.detailLength}
              aria-label={`Detail ${index + 1}`}
              aria-invalid={error ? true : undefined}
              placeholder={index === 0 ? "e.g. 100% wool" : undefined}
              onChange={(event) => commit(rows.map((r, i) => (i === index ? event.target.value : r)))}
              onKeyDown={(event) => onKeyDown(event, index)}
              onBlur={onBlur}
              className="h-12 min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-subtle"
            />
            <button
              type="button"
              onClick={() => {
                commit(rows.length > 1 ? rows.filter((_, i) => i !== index) : [""]);
                focusRow(Math.max(0, index - 1), true);
              }}
              disabled={readOnly || (rows.length === 1 && row === "")}
              aria-label={`Remove detail ${index + 1}`}
              className="flex size-8 shrink-0 items-center justify-center text-subtle transition-colors duration-200 hover:text-ink disabled:invisible [&_svg]:size-3.5"
            >
              <CloseIcon />
            </button>
          </li>
        ))}
      </ol>
      {error && (
        <p id={`${id}-error`} className="mt-2 animate-rise text-body-sm text-error [animation-duration:0.35s]">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={readOnly || full}
          onClick={() => {
            commit([...rows, ""]);
            focusRow(rows.length);
          }}
        >
          Add detail
        </Button>
        <p id={`${id}-hint`} className="text-body-sm text-muted">
          Shown as a list on the product page. Up to {PRODUCT_LIMITS.detailLines}.
        </p>
      </div>
    </fieldset>
  );
}
