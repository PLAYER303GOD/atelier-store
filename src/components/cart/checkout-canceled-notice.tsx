"use client";

import { useEffect } from "react";

import { useCancelCheckout } from "@/components/cart/use-cancel-checkout";

/**
 * Shown on /bag when Stripe sends the customer back ("← Back" on the payment page). It also
 * closes that checkout on the server, so the pieces it held are free again straight away rather
 * than when the session expires. It says the checkout is cancelled only once the server confirms
 * it; on failure it offers to try again. Closing is idempotent, so a reload is harmless.
 */
export function CheckoutCanceledNotice({ reference }: { reference: string | undefined }) {
  const { state, cancel } = useCancelCheckout(reference);

  useEffect(() => {
    if (state === "idle") cancel();
  }, [state, cancel]);

  if (state === "error") {
    return (
      <div role="alert" className="mb-6 border-l-2 border-error bg-surface px-4 py-3 text-body-sm">
        <p>
          You left checkout, but we couldn&rsquo;t cancel it just now. The pieces in it stay reserved until it
          expires.{" "}
          <button type="button" onClick={cancel} className={actionClass}>
            Try again
          </button>
        </p>
      </div>
    );
  }

  const settled = !reference || state === "done";
  return (
    <p role="status" aria-busy={!settled} className="mb-6 border-l-2 border-ink bg-surface px-4 py-3 text-body-sm">
      {settled
        ? "Checkout was cancelled and you haven’t been charged. Your bag is just as you left it."
        : "Cancelling your checkout…"}
    </p>
  );
}

const actionClass =
  "font-medium underline underline-offset-4 hover:decoration-transparent aria-disabled:pointer-events-none aria-disabled:text-subtle";
