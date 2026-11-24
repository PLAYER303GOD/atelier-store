// Returns the stock held by checkouts that never reached Stripe.
//   pnpm orders:release-expired
//
// A pending order normally gets its Checkout Session moments after it's created, and from then on
// Stripe's `checkout.session.expired` webhook releases it. If the process died in between, the
// order has no session, so no webhook will ever come. Such an order can never be paid, so once its
// hold has run out it is released here. Run it on a schedule (e.g. every 15 minutes from cron or
// your host's scheduler); it doesn't depend on the customer coming back.
//
// Safe to run any number of times, even concurrently: each release is one guarded statement that
// also requires the order to still have no session, so stock comes back exactly once.

import { findExpiredUnlinkedOrders, releaseOrder } from "../lib/order-store";

/** Past expires_at by this much, so an order whose session is being created right now is left alone. */
const GRACE_MINUTES = 5;

async function main() {
  const stale = await findExpiredUnlinkedOrders(GRACE_MINUTES);
  let released = 0;
  for (const order of stale) {
    if (await releaseOrder(order.id, "expired", { unlinkedOnly: true })) {
      released++;
      console.log(`${order.reference}: expired, stock returned`);
    }
  }
  console.log(`Released ${released} of ${stale.length} expired checkout(s) without a Stripe session.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
