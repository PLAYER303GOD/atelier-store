// Stripe webhook: the only place an order becomes paid, failed or expired.
//
//   1. Verify the signature on the raw body with STRIPE_WEBHOOK_SECRET. Anything unsigned or
//      tampered is rejected with 400 before it is parsed.
//   2. Skip events already recorded in stripe_events (Stripe delivers at least once).
//   3. Apply the event (src/lib/stripe-webhook.ts). Transitions are guarded, so a duplicate that
//      slips past step 2 (two deliveries at once) still changes nothing the second time.
//   4. Record the event, then answer 200. If anything throws, answer 500 so Stripe retries;
//      the event wasn't recorded, so the retry is processed.
//
// Subscribe the endpoint to exactly the events in HANDLED_EVENTS.

import { revalidateTag } from "next/cache";
import type Stripe from "stripe";

import { isEventProcessed, recordEvent } from "@/lib/order-store";
import { getStripe } from "@/lib/stripe";
import { applyCheckoutEvent, isHandledEvent } from "@/lib/stripe-webhook";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  let stripe: Stripe;
  try {
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    stripe = getStripe();
  } catch (error) {
    // Misconfiguration, not a bad request: 500 so Stripe keeps retrying until it's fixed.
    console.error("Stripe webhook is not configured", error);
    return new Response("Webhook not configured", { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    // The exact bytes Stripe signed: read as text, never re-serialised JSON.
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (!isHandledEvent(event.type)) return Response.json({ received: true, ignored: event.type });

  try {
    if (await isEventProcessed(event.id)) return Response.json({ received: true, duplicate: true });

    const outcome = await applyCheckoutEvent(event.type, event.data.object as Stripe.Checkout.Session);
    if (outcome.stockChanged) revalidateTag("products", "max");
    await recordEvent(event.id, event.type);

    console.info(`Stripe ${event.type} ${event.id}: ${outcome.result}`);
    return Response.json({ received: true });
  } catch (error) {
    console.error(`Stripe webhook ${event.type} ${event.id} failed`, error);
    return new Response("Webhook handler failed", { status: 500 });
  }
}
