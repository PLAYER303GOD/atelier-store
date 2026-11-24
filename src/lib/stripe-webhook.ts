// Applies verified Stripe Checkout events to orders. Plain module (no Next.js APIs): the route
// handler verifies the signature and dedupes; this decides what the event means for the order.
//
// Only the four events our checkout flow needs are handled. Everything else is ignored. Every
// transition is a guarded update in order-store.ts, so applying an event twice, or after a later
// one, changes nothing.

import type Stripe from "stripe";

import type { OrderShipping } from "@/db/schema";
import {
  findOrderByReference,
  markOrderPaid,
  markOrderProcessing,
  type PaymentConfirmation,
  releaseOrder,
} from "@/lib/order-store";

export const HANDLED_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
] as const;
type HandledEvent = (typeof HANDLED_EVENTS)[number];

export const isHandledEvent = (type: string): type is HandledEvent => (HANDLED_EVENTS as readonly string[]).includes(type);

export type EventOutcome = {
  /** Whether stock changed (the catalogue cache should be refreshed). */
  stockChanged: boolean;
  /** For the log. */
  result: string;
};

export async function applyCheckoutEvent(type: HandledEvent, session: Stripe.Checkout.Session): Promise<EventOutcome> {
  const reference = session.metadata?.order_reference ?? session.client_reference_id;
  if (!reference) return { stockChanged: false, result: "ignored: session has no order reference" };

  const order = await findOrderByReference(reference);
  if (!order) return { stockChanged: false, result: `ignored: no order ${reference}` };
  // A session we replaced or closed (its order points at another one) must not move the order.
  if (order.stripeCheckoutSessionId && order.stripeCheckoutSessionId !== session.id) {
    return { stockChanged: false, result: `ignored: ${session.id} is not ${reference}'s session` };
  }

  switch (type) {
    case "checkout.session.completed":
      if (session.payment_status === "unpaid") {
        // Async payment method (e.g. bank debit): wait for async_payment_succeeded / _failed.
        const moved = await markOrderProcessing(order.id, session.id);
        return { stockChanged: false, result: moved ? `${reference} processing` : `${reference} unchanged (${order.status})` };
      }
      return confirmPaid(order, reference, session);

    case "checkout.session.async_payment_succeeded":
      return confirmPaid(order, reference, session);

    case "checkout.session.async_payment_failed": {
      const released = await releaseOrder(order.id, "failed");
      return { stockChanged: released, result: released ? `${reference} failed, stock returned` : `${reference} unchanged (${order.status})` };
    }

    case "checkout.session.expired": {
      const released = await releaseOrder(order.id, "expired");
      return { stockChanged: released, result: released ? `${reference} expired, stock returned` : `${reference} unchanged (${order.status})` };
    }
  }
}

async function confirmPaid(
  order: { id: number; status: string; totalCents: number; currency: string },
  reference: string,
  session: Stripe.Checkout.Session,
): Promise<EventOutcome> {
  const payment: PaymentConfirmation = {
    sessionId: session.id,
    paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null),
    amountPaidCents: session.amount_total ?? 0,
    shipping: shippingFrom(session),
  };

  // The session was built from the order, so these match unless something is badly wrong. The
  // money has been taken either way, so the order is still marked paid; the log flags it.
  if (session.amount_total !== order.totalCents || session.currency !== order.currency) {
    console.error(
      `Stripe amount mismatch on ${reference}: charged ${session.amount_total} ${session.currency}, order ${order.totalCents} ${order.currency}`,
    );
  }

  const paid = await markOrderPaid(order.id, payment);
  if (paid) return { stockChanged: false, result: `${reference} paid` };

  // Not changed. Read the status again: a parallel delivery of the same payment may have just
  // marked it paid, which is fine. Anything else means a payment arrived for a closed order
  // (its stock released): that needs a person (refund, or re-allocate stock). It shouldn't
  // happen, because sessions are expired before their orders are closed.
  const now = (await findOrderByReference(reference))?.status;
  if (now !== "paid") {
    console.error(`Stripe payment for closed order ${reference} (${now}); review and refund if needed`);
  }
  return { stockChanged: false, result: `${reference} unchanged (${now})` };
}

function shippingFrom(session: Stripe.Checkout.Session): OrderShipping | null {
  const details = session.collected_information?.shipping_details;
  if (!details) return null;
  const a = details.address;
  return {
    name: details.name,
    phone: session.customer_details?.phone ?? null,
    address: {
      line1: a.line1 ?? "",
      line2: a.line2 ?? null,
      city: a.city ?? "",
      state: a.state ?? null,
      postalCode: a.postal_code ?? "",
      country: a.country ?? "",
    },
  };
}
