"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Delays between re-renders while Stripe's confirmation is on its way. The webhook usually lands
 * a second or two after the redirect, so check every second first, then back off. About two
 * minutes in all. Each refresh re-renders the whole page, header bag count included.
 */
const DELAYS_MS = [...Array(10).fill(1000), ...Array(10).fill(3000), ...Array(16).fill(5000)];

/**
 * Re-renders the (server) page until the order leaves "pending": once it's confirmed the page
 * renders without this component, which stops the timer.
 */
export function AwaitConfirmation() {
  const router = useRouter();

  useEffect(() => {
    let step = 0;
    let timer: number;
    const next = () => {
      if (step >= DELAYS_MS.length) return;
      timer = window.setTimeout(() => {
        router.refresh();
        next();
      }, DELAYS_MS[step++]);
    };
    next();
    return () => window.clearTimeout(timer);
  }, [router]);

  return null;
}
