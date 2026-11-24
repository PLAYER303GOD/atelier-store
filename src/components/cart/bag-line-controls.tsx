"use client";

import { useState, useTransition } from "react";

import { MinusIcon, PlusIcon } from "@/components/icons";
import { type BagActionResult, removeFromBag, updateBagQuantity } from "@/lib/cart-actions";
import { cn } from "@/lib/cn";

type Props = { slug: string; name: string; quantity: number; available: number; unavailable: boolean };

const stepButton =
  "flex size-10 items-center justify-center text-ink transition-colors hover:bg-surface aria-disabled:pointer-events-none aria-disabled:text-subtle [&_svg]:size-4";

/**
 * Quantity stepper + Remove for one bag line. The server clamps every change to live stock, so
 * "+" is only a convenience limit here. One transition locks the whole line while a change is
 * in flight; the new quantity comes back from the server (refresh) and is announced politely.
 */
export function BagLineControls({ slug, name, quantity, available, unavailable }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (action: () => Promise<BagActionResult>) => {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
    });
  };

  const atMax = quantity >= available;
  const atMin = quantity <= 1;

  return (
    <div aria-busy={pending} className={cn("transition-opacity duration-200", pending && "opacity-60")}>
      <div className="flex items-center gap-5">
        {!unavailable && (
          <div role="group" aria-label={`Quantity of ${name}`} className="inline-flex items-center border border-line">
            <button
              type="button"
              className={stepButton}
              aria-label={`Decrease quantity of ${name}`}
              aria-disabled={atMin || pending || undefined}
              onClick={() => !atMin && run(() => updateBagQuantity(slug, quantity - 1))}
            >
              <MinusIcon />
            </button>
            <output aria-live="polite" className="w-8 text-center text-body-sm tabular-nums">
              {quantity}
            </output>
            <button
              type="button"
              className={stepButton}
              aria-label={atMax ? `Maximum available for ${name}` : `Increase quantity of ${name}`}
              aria-disabled={atMax || pending || undefined}
              onClick={() => !atMax && run(() => updateBagQuantity(slug, quantity + 1))}
            >
              <PlusIcon />
            </button>
          </div>
        )}
        <button
          type="button"
          aria-disabled={pending || undefined}
          onClick={() => run(() => removeFromBag(slug))}
          className="text-label font-medium text-muted uppercase underline-offset-4 transition-colors hover:text-ink hover:underline aria-disabled:pointer-events-none"
        >
          Remove<span className="sr-only"> {name}</span>
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-body-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
