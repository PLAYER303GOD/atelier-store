"use client";

import { type FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { adjustProductStock, type StockAdjustResult } from "@/lib/admin-product-actions";

/**
 * Compact "Adjust by" for a table row (/admin/stock): a short field and Apply, with the result
 * or error underneath. Same action and rules as StockAdjust.
 */
export function StockAdjustInline({ slug, name }: { slug: string; name: string }) {
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<StockAdjustResult | { ok: false; error: string } | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const delta = parseDelta(value);
    if (delta === null) {
      setResult({ ok: false, error: "Enter a whole number like 5 or -1, not 0." });
      return;
    }
    setResult(null);
    startTransition(async () => {
      const outcome = await adjustProductStock(slug, delta);
      setResult(outcome);
      if (outcome.ok) setValue("");
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={pending}>
      <div className="flex items-center gap-3">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          readOnly={pending}
          onChange={(event) => {
            setValue(event.target.value);
            setResult(null);
          }}
          aria-label={`Adjust stock of ${name} by`}
          aria-invalid={result && !result.ok ? true : undefined}
          placeholder="+5 / -1"
          className={`h-10 w-20 border-b bg-transparent text-body-sm tabular-nums outline-none transition-colors duration-200 placeholder:text-subtle focus-visible:border-ink ${result && !result.ok ? "border-error" : "border-line hover:border-muted"}`}
        />
        <button
          type="submit"
          aria-disabled={pending || undefined}
          className="text-label font-medium uppercase underline underline-offset-4 hover:decoration-transparent aria-disabled:pointer-events-none aria-disabled:text-subtle"
        >
          {pending ? "Applying…" : "Apply"}
          <span className="sr-only"> to {name}</span>
        </button>
      </div>
      <p aria-live="polite" className={`mt-1 text-caption ${result?.ok ? "text-success" : "text-error"} empty:hidden`}>
        {result && (result.ok ? `✓ Now ${result.stock}` : result.error)}
      </p>
    </form>
  );
}

const parseDelta = (text: string): number | null => {
  const clean = text.trim().replace(/^\+/, "");
  if (!/^-?\d{1,4}$/.test(clean)) return null;
  const n = Number(clean);
  return n !== 0 && Math.abs(n) <= 1000 ? n : null;
};

/**
 * Stock for one product: available now and held by open checkouts, plus an "Adjust by" field
 * (+5 for a delivery, -1 for a damaged piece). The server applies it atomically and never lets
 * stock go below 0; the page re-renders with the new figures.
 */
export function StockAdjust({ slug, stock, held }: { slug: string; stock: number; held: number }) {
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<StockAdjustResult | null>(null);

  const delta = parseDelta(value);
  const error = touched && delta === null ? "Enter a whole number like 5 or -1 (up to 1000), not 0." : undefined;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setTouched(true);
    if (delta === null) return;
    setResult(null);
    startTransition(async () => {
      const outcome = await adjustProductStock(slug, delta);
      setResult(outcome);
      if (outcome.ok) {
        setValue("");
        setTouched(false);
      }
    });
  }

  return (
    <div>
      <dl className="grid grid-cols-2 gap-px border border-line bg-line sm:max-w-md">
        <div className="bg-paper p-5">
          <dt className="text-label font-medium text-muted uppercase">Available</dt>
          <dd className="mt-2 text-display-sm tabular-nums">{stock}</dd>
        </div>
        <div className="bg-paper p-5">
          <dt className="text-label font-medium text-muted uppercase">Held in checkouts</dt>
          <dd className="mt-2 text-display-sm tabular-nums">{held}</dd>
        </div>
      </dl>
      <p className="mt-3 max-w-xl text-body-sm text-muted">
        Held units are reserved by customers who are paying now; they come back automatically if the checkout isn&rsquo;t
        completed.
      </p>

      <form onSubmit={onSubmit} noValidate aria-busy={pending} className="mt-6 flex max-w-md flex-wrap items-start gap-4">
        <TextField
          label="Adjust by"
          name="delta"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          readOnly={pending}
          onChange={(event) => {
            setValue(event.target.value);
            setResult(null);
          }}
          onBlur={() => value && setTouched(true)}
          error={error ?? (result && !result.ok ? result.error : undefined)}
          hint="+5 for a delivery, -1 for a damaged piece."
          className="min-w-0 flex-1"
        />
        <Button type="submit" variant="secondary" className="mt-7" aria-disabled={pending || undefined}>
          {pending && (
            <span aria-hidden="true" className="size-4 animate-spin rounded-full border border-current border-t-transparent" />
          )}
          {pending ? "Applying…" : "Apply"}
        </Button>
      </form>
      <p aria-live="polite" className="mt-3 text-body-sm text-success">
        {result?.ok && <span className="inline-block animate-rise [animation-duration:0.35s]">✓ Stock is now {result.stock}.</span>}
      </p>
    </div>
  );
}
