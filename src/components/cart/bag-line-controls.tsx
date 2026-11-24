"use client";

import { useState, useTransition } from "react";

import { useBagRemoved } from "@/components/cart/bag-feedback";
import { MinusIcon, PlusIcon } from "@/components/icons";
import { type BagActionResult, removeFromBag, updateBagQuantity } from "@/lib/cart-actions";
import { cn } from "@/lib/cn";

type Props = { slug: string; name: string; quantity: number; available: number; unavailable: boolean };

const stepButton =
  "flex size-10 items-center justify-center text-ink transition-colors hover:bg-surface aria-disabled:pointer-events-none aria-disabled:text-subtle [&_svg]:size-4";

/**
 * Quantity stepper + Remove for one bag line. The server clamps every change to live stock, so
 * "+" is only a convenience limit here. One transition locks the whole line while a change is
 * in flight; the new quantity comes back from the server (refresh). Each line announces only its
 * own changes (a stock cap is shown); a remove hands off to <BagFeedback> (focus + Undo).
 */
export function BagLineControls({ slug, name, quantity, available, unavailable }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ text: string; visible: boolean } | null>(null);
  const notifyRemoved = useBagRemoved();

  const change = (next: number) => {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await updateBagQuantity(slug, next);
      if (!result.ok) return setError(result.error);
      setStatus(
        result.limited
          ? { text: `Only ${result.available} available.`, visible: true }
          : { text: `Quantity of ${name}: ${result.quantity}.`, visible: false },
      );
    });
  };

  const remove = () => {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result: BagActionResult = await removeFromBag(slug);
      if (!result.ok) return setError(result.error);
      notifyRemoved({ slug, name, quantity: Math.max(quantity, 1) });
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
              onClick={() => !atMin && change(quantity - 1)}
            >
              <MinusIcon />
            </button>
            <output className="w-8 text-center text-body-sm tabular-nums">
              {quantity}
            </output>
            <button
              type="button"
              className={stepButton}
              aria-label={atMax ? `Maximum available for ${name}` : `Increase quantity of ${name}`}
              aria-disabled={atMax || pending || undefined}
              onClick={() => !atMax && change(quantity + 1)}
            >
              <PlusIcon />
            </button>
          </div>
        )}
        <button
          type="button"
          aria-disabled={pending || undefined}
          onClick={remove}
          className="text-label font-medium text-muted uppercase underline-offset-4 transition-colors hover:text-ink hover:underline aria-disabled:pointer-events-none"
        >
          Remove<span className="sr-only"> {name}</span>
        </button>
      </div>
      <p role="status" className={status?.visible ? "mt-2 text-body-sm text-warning" : "sr-only"}>
        {status?.text}
      </p>
      {error && (
        <p role="alert" className="mt-2 text-body-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
