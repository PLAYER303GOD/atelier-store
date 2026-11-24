"use client";

import { useCallback, useRef, useState, useTransition } from "react";

import { cancelCheckout } from "@/lib/checkout-actions";

export type CancelState = "idle" | "pending" | "done" | "error";

/**
 * Cancels the customer's open checkout through the server (which expires the Stripe session,
 * returns the held stock and refreshes the page). Reports the real outcome: "done" only when the
 * server says the checkout is closed. One request at a time; after a failure it can be retried.
 */
export function useCancelCheckout(reference: string | undefined) {
  const [state, setState] = useState<CancelState>("idle");
  const [, startTransition] = useTransition();
  const inFlight = useRef(false);

  const cancel = useCallback(() => {
    if (!reference || inFlight.current) return;
    inFlight.current = true;
    setState("pending");
    startTransition(async () => {
      const result = await cancelCheckout(reference);
      setState(result.ok ? "done" : "error");
      inFlight.current = false; // allows "Try again" after a failure
    });
  }, [reference]);

  return { state, cancel };
}
