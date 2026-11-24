"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * While Stripe's confirmation is on its way, re-renders the (server) page every few seconds so
 * it switches to "confirmed" by itself. Stops after about a minute; the page says what to do then.
 */
export function AwaitConfirmation({ intervalMs = 3000, attempts = 20 }: { intervalMs?: number; attempts?: number }) {
  const router = useRouter();

  useEffect(() => {
    let left = attempts;
    const id = window.setInterval(() => {
      if (--left <= 0) window.clearInterval(id);
      router.refresh();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [router, intervalMs, attempts]);

  return null;
}
