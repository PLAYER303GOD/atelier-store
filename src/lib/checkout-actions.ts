"use server";

// Starting and cancelling Stripe Checkout. Server Functions are public POST endpoints, so:
//   - the caller must be signed in (requireUser, read fresh), and acts only on their own bag/orders;
//   - prices, quantities and products come from Postgres, never from the client. The only input
//     is the bag signature the page rendered, used to refuse checkout if the bag changed;
//   - this never marks an order paid. Payment is confirmed by Stripe's webhook (next step).
//
// Flow: close the user's earlier open checkout → re-read the bag live → create the order and hold
// its stock in one transaction → create the Checkout Session from the order snapshot → link it →
// redirect to Stripe. The bag itself is left untouched until payment is confirmed.

import type Stripe from "stripe";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { toBag } from "@/lib/cart";
import { findUserCartId, readLines } from "@/lib/cart-store";
import {
  attachCheckoutSession,
  createOrderWithHold,
  findOpenOrders,
  findPendingOrder,
  HOLD_MINUTES,
  newOrderReference,
  OutOfStockError,
  releaseOrder,
} from "@/lib/order-store";
import { getSignedInUser, requireUser } from "@/lib/session";
import { appUrl, getStripe, isMissingResource } from "@/lib/stripe";

export type CheckoutResult = { ok: false; error: string };

const GENERIC_ERROR = "We couldn't start checkout. Please try again.";
const REFERENCE_PATTERN = /^AT-[2-9A-HJ-NP-Z]{8}$/;
/** Tags our sessions in the Stripe Dashboard (fixed label + 8 random letters, per Stripe's guidance). */
const INTEGRATION_IDENTIFIER = "atelier_bag_checkout_qhzmwtrd";

/**
 * Starts Stripe Checkout for the signed-in user's bag. On success it redirects to Stripe and
 * doesn't return. Guests are sent to sign-in and come back to /bag (their bag merges at sign-in).
 */
export async function startCheckout(signature: string): Promise<CheckoutResult> {
  if (typeof signature !== "string" || signature.length > 10_000) {
    return { ok: false, error: "That isn't a valid request." };
  }
  const user = await requireUser("/bag");

  let url: string;
  try {
    const result = await beginCheckout(user, signature);
    if ("error" in result) return { ok: false, error: result.error };
    url = result.url;
  } catch (error) {
    console.error("startCheckout failed", error);
    return { ok: false, error: GENERIC_ERROR };
  }
  redirect(url); // outside try: redirect() works by throwing
}

async function beginCheckout(
  user: { id: string; email: string },
  signature: string,
): Promise<{ url: string } | { error: string }> {
  // 0. Config first: a missing key or URL must fail before any stock is held.
  const stripe = getStripe();
  const base = appUrl();

  // 1. One open checkout per user: close earlier ones so their stock is back before we check.
  if (await closeOpenCheckouts(user.id)) updateTag("products");

  // 2. Re-read the bag live (prices and stock straight from Postgres) and compare with the page.
  const cartId = await findUserCartId(user.id);
  const rows = cartId === undefined ? [] : await readLines(cartId);
  const bag = toBag(rows);
  if (bag.lines.length === 0) return { error: "Your bag is empty." };
  if (bag.lines.some((line) => line.status === "unavailable")) {
    refresh();
    return { error: "Remove the pieces that are no longer available, then check out." };
  }
  if (bag.signature !== signature) {
    refresh();
    return { error: "Your bag has changed. Please review it before checking out." };
  }

  // 3. Create the order and hold the stock (one transaction; fails as a whole on a shortfall).
  const reference = newOrderReference();
  const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);
  // toBag maps rows one-to-one, in order.
  const lines = bag.lines.map((line, i) => ({
    productId: rows[i].productId,
    slug: line.slug,
    name: line.name,
    colour: line.colour,
    image: line.image,
    unitPriceCents: line.unitPriceCents,
    quantity: line.quantity,
  }));

  let order: { id: number };
  try {
    order = await createOrderWithHold({ reference, userId: user.id, lines, expiresAt });
  } catch (error) {
    if (error instanceof OutOfStockError) {
      refresh();
      return { error: "Some pieces have just sold out. We've updated your bag." };
    }
    throw error;
  }
  updateTag("products"); // stock changed

  // 4. Stripe Checkout Session, built only from the order snapshot. Hosted page, dynamic payment
  //    methods (no payment_method_types), no automatic tax (no registration yet).
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: lines.map((line) => ({
          quantity: line.quantity,
          price_data: {
            currency: "usd",
            unit_amount: line.unitPriceCents,
            product_data: {
              name: line.name,
              description: line.colour,
              images: line.image.src.startsWith("https://") ? [line.image.src] : undefined,
              metadata: { slug: line.slug },
            },
          },
        })),
        customer_email: user.email,
        client_reference_id: reference,
        metadata: { order_reference: reference },
        payment_intent_data: { metadata: { order_reference: reference } },
        shipping_address_collection: { allowed_countries: ["US"] },
        phone_number_collection: { enabled: true },
        expires_at: Math.floor(expiresAt.getTime() / 1000),
        integration_identifier: INTEGRATION_IDENTIFIER,
        success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/bag?checkout=canceled&order=${reference}`,
      },
      { idempotencyKey: `checkout-session-${reference}` },
    );
  } catch (error) {
    await releaseOrder(order.id, "canceled");
    updateTag("products");
    throw error;
  }

  // 5. Link it. If the order was closed meanwhile (a parallel checkout), close the new session too.
  if (!session.url || !(await attachCheckoutSession(order.id, session.id))) {
    await expireQuietly(stripe, session.id);
    await releaseOrder(order.id, "canceled");
    updateTag("products");
    return { error: GENERIC_ERROR };
  }
  return { url: session.url };
}

/**
 * Called when Stripe sends the customer back via "← Back" (cancel_url). Closes that checkout
 * right away so its stock is free again, instead of waiting for the session to expire.
 */
export async function cancelCheckout(reference: string): Promise<{ ok: boolean }> {
  if (typeof reference !== "string" || !REFERENCE_PATTERN.test(reference)) return { ok: false };
  try {
    const user = await getSignedInUser();
    if (!user) return { ok: false };
    const order = await findPendingOrder(reference, user.id);
    if (!order) return { ok: true }; // already closed (or not theirs): nothing to do
    if (await closeCheckout(order)) {
      updateTag("products");
      refresh();
    }
    return { ok: true };
  } catch (error) {
    console.error("cancelCheckout failed", error);
    return { ok: false };
  }
}

/** Closes all the user's pending checkouts. Returns whether any stock came back. */
async function closeOpenCheckouts(userId: string): Promise<boolean> {
  let released = false;
  for (const order of await findOpenOrders(userId)) {
    // "processing" means Stripe has the payment (async method); leave it to the webhook.
    if (order.status === "pending" && (await closeCheckout(order))) released = true;
  }
  return released;
}

/**
 * Expires a pending order's Checkout Session at Stripe, then returns its stock. If Stripe says
 * the session already completed, the customer has paid: leave the order for the webhook.
 */
async function closeCheckout(order: { id: number; stripeCheckoutSessionId: string | null }): Promise<boolean> {
  if (!order.stripeCheckoutSessionId) return releaseOrder(order.id, "canceled");
  const stripe = getStripe();
  try {
    await stripe.checkout.sessions.expire(order.stripeCheckoutSessionId);
    return releaseOrder(order.id, "canceled");
  } catch (error) {
    // Unknown to this Stripe account (e.g. created with a key for another account or sandbox):
    // no payment for it can ever reach our webhook, so it must not hold stock or block checkout.
    if (isMissingResource(error)) return releaseOrder(order.id, "canceled");
    const session = await stripe.checkout.sessions.retrieve(order.stripeCheckoutSessionId);
    if (session.status === "expired") return releaseOrder(order.id, "expired");
    return false; // complete: paid or paying
  }
}

async function expireQuietly(stripe: Stripe, sessionId: string) {
  try {
    await stripe.checkout.sessions.expire(sessionId);
  } catch (error) {
    console.error("Expiring an orphaned Checkout Session failed", sessionId, error);
  }
}
