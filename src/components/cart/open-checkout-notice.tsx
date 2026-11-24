"use client";

import { useCancelCheckout } from "@/components/cart/use-cancel-checkout";
import type { OpenCheckout } from "@/lib/checkout";

const actionClass =
  "font-medium underline underline-offset-4 hover:decoration-transparent aria-disabled:pointer-events-none aria-disabled:text-subtle";

/**
 * On /bag while the customer has a checkout open. Their own hold can make a piece look
 * unavailable here, so they get a way to finish that payment or cancel it; cancelling returns
 * the stock and refreshes the bag, which recalculates what can be checked out. A checkout whose
 * payment is being confirmed has no actions: paying again is what we must avoid.
 */
export function OpenCheckoutNotice({ checkout }: { checkout: OpenCheckout }) {
  const { state, cancel } = useCancelCheckout(checkout.reference);

  if (checkout.status === "processing") {
    return (
      <p role="status" className="mb-6 border-l-2 border-ink bg-surface px-4 py-3 text-body-sm">
        Your last payment is still being confirmed. There&rsquo;s no need to pay again; we&rsquo;ll update order{" "}
        {checkout.reference} as soon as it clears.
      </p>
    );
  }

  const pending = state === "pending";
  return (
    <div
      role="status"
      aria-busy={pending}
      className={`mb-6 border-l-2 bg-surface px-4 py-3 text-body-sm ${state === "error" ? "border-error" : "border-ink"}`}
    >
      <p>
        {state === "error"
          ? "We couldn’t cancel your checkout just now. Its payment may already be going through; if not, try again."
          : "You have a checkout in progress. The pieces in it are reserved for you while it’s open."}
      </p>
      <p className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
        {checkout.resumeUrl && (
          <a href={checkout.resumeUrl} className={actionClass}>
            Return to payment
          </a>
        )}
        <button type="button" onClick={cancel} aria-disabled={pending || undefined} className={actionClass}>
          {pending ? "Cancelling…" : state === "error" ? "Try again" : "Cancel checkout"}
        </button>
      </p>
    </div>
  );
}
