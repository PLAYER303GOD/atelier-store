// Reading the customer's open checkout (server-only), for the bag page. Never writes.

import "server-only";

import { findOpenOrders } from "@/lib/order-store";
import { getSignedInUser } from "@/lib/session";
import { getStripe } from "@/lib/stripe";

export type OpenCheckout = {
  reference: string;
  status: "pending" | "processing";
  /** Stripe's hosted page while the session is still open, to finish paying. */
  resumeUrl: string | null;
};

/** The signed-in customer's open checkout, if any (at most one, by orders_one_open_per_user). */
export async function getOpenCheckout(): Promise<OpenCheckout | null> {
  const user = await getSignedInUser();
  if (!user) return null;
  const [order] = await findOpenOrders(user.id);
  if (!order) return null;

  let resumeUrl: string | null = null;
  if (order.status === "pending" && order.stripeCheckoutSessionId) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(order.stripeCheckoutSessionId);
      if (session.status === "open") resumeUrl = session.url;
    } catch (error) {
      console.warn(`Couldn't look up the Checkout Session for ${order.reference}`, error);
    }
  }
  return { reference: order.reference, status: order.status === "processing" ? "processing" : "pending", resumeUrl };
}
