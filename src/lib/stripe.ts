// The Stripe client (server-only). Created on first use rather than at import, so pages and
// builds that never touch checkout don't need the keys.
//
// STRIPE_SECRET_KEY should be a restricted key (rk_…) with write access to Checkout Sessions
// only. Never log it or send it to the client.

import "server-only";

import Stripe from "stripe";

let client: Stripe | undefined;

export function getStripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set. Add a Stripe sandbox key to .env.local and restart.");
  client = new Stripe(key, { apiVersion: "2026-11-18.endive", appInfo: { name: "atelier-store" } });
  return client;
}

/** Origin for Stripe's success / cancel URLs. Never derived from request headers. */
export function appUrl(): string {
  const url = process.env.APP_URL ?? process.env.BETTER_AUTH_URL;
  if (!url) throw new Error("APP_URL (or BETTER_AUTH_URL) is not set.");
  return url.replace(/\/+$/, "");
}
