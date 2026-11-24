"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { type CheckoutResult, startCheckout } from "@/lib/checkout-actions";

/**
 * Bag "Checkout". The server re-reads the bag, holds the stock and redirects to Stripe; this
 * only posts the signature of the bag it was rendered with and shows a refusal if one comes
 * back. While the request runs the button stays focusable (aria-disabled) and repeat clicks
 * are ignored. `blockedReason` (unavailable pieces, or an earlier payment still being
 * confirmed) disables it outright and says why.
 */
export function CheckoutButton({ signature, blockedReason }: { signature: string; blockedReason: string | null }) {
  const blocked = blockedReason !== null;
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CheckoutResult | null>(null);

  const checkout = () => {
    if (pending) return;
    setResult(null);
    startTransition(async () => {
      // Resolves only on a refusal; on success the server redirects to Stripe.
      setResult(await startCheckout(signature));
    });
  };

  return (
    <div>
      <Button fullWidth onClick={checkout} disabled={blocked} aria-disabled={pending || undefined}>
        {pending && (
          <span aria-hidden="true" className="size-4 animate-spin rounded-full border border-current border-t-transparent" />
        )}
        {pending ? "Opening checkout…" : "Checkout"}
      </Button>
      <p className="mt-3 text-center text-body-sm text-muted">
        {blockedReason ?? "Secure payment with Stripe."}
      </p>

      <div aria-live="polite">
        {result && !pending && (
          <p
            key={result.error}
            role="alert"
            className="mt-3 animate-[vt-fade_0.4s_var(--ease-standard)_both] text-body-sm text-error"
          >
            {result.error}
          </p>
        )}
      </div>
    </div>
  );
}
