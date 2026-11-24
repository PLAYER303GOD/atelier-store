"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { addToBag, type BagActionResult } from "@/lib/cart-actions";

/**
 * Product-page "Add to bag". The server decides everything (live stock, clamping, which bag);
 * this shows the outcome: added, limited by stock, or an error. While the request runs the
 * button stays focusable (aria-disabled, not disabled) and repeat clicks are ignored.
 */
export function AddToBagButton({ slug, soldOut }: { slug: string; soldOut: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<BagActionResult | null>(null);

  if (soldOut) {
    return (
      <Button fullWidth className="mt-8" disabled>
        Out of stock
      </Button>
    );
  }

  const add = () => {
    if (pending) return;
    startTransition(async () => {
      setResult(await addToBag(slug, 1));
    });
  };

  return (
    <div className="mt-8">
      <Button fullWidth onClick={add} aria-disabled={pending || undefined}>
        {pending && (
          <span aria-hidden="true" className="size-4 animate-spin rounded-full border border-current border-t-transparent" />
        )}
        {pending ? "Adding…" : "Add to bag"}
      </Button>

      {/* Outcome, announced politely; errors as an alert. Keyed so each click re-animates. */}
      <div aria-live="polite" className="min-h-0">
        {result && !pending && (
          <p
            key={JSON.stringify(result)}
            role={result.ok ? undefined : "alert"}
            className={`mt-3 animate-[vt-fade_0.4s_var(--ease-standard)_both] text-body-sm ${result.ok ? "text-ink" : "text-error"}`}
          >
            {!result.ok
              ? result.error
              : result.limited
                ? `Only ${result.available} available. You have all ${result.quantity} in your bag. `
                : `Added to your bag${result.quantity > 1 ? ` (${result.quantity} in total)` : ""}. `}
            {result.ok && (
              <Link href="/bag" className="underline underline-offset-4 hover:decoration-transparent">
                View bag
              </Link>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
