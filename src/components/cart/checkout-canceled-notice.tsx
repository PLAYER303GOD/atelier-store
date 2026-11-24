"use client";

import { useEffect, useRef } from "react";

import { cancelCheckout } from "@/lib/checkout-actions";

/**
 * Shown on /bag when Stripe sends the customer back ("← Back" on the payment page). It also
 * closes that checkout on the server, so the pieces it held are free again straight away rather
 * than when the session expires. Closing is idempotent, so a reload is harmless.
 */
export function CheckoutCanceledNotice({ reference }: { reference: string | undefined }) {
  const sent = useRef(false);

  useEffect(() => {
    if (!reference || sent.current) return;
    sent.current = true;
    void cancelCheckout(reference);
  }, [reference]);

  return (
    <p role="status" className="mb-6 border-l-2 border-ink bg-surface px-4 py-3 text-body-sm">
      Checkout was cancelled and you haven&rsquo;t been charged. Your bag is just as you left it.
    </p>
  );
}
