// Order database access. Plain functions, no Next.js APIs (like src/lib/cart-store.ts), so the
// webhook route and scripts can use them too. Callers decide *whose* order; nothing here trusts
// an id from a client.
//
// Stock holds: creating an order takes its stock in the same transaction (db.batch on the Neon
// HTTP driver is one transaction). The `stocks_quantity_non_negative` check makes that atomic:
// if any piece sold in the meantime the whole batch fails with 23514 and nothing is written.
// Releasing a hold is one statement that moves the order out of an open status *and* returns
// its stock, so stock comes back exactly once however often it is called.

import { randomInt } from "node:crypto";

import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  cartItems,
  carts,
  type OrderShipping,
  type OrderStatus,
  orderItems,
  orders,
  stocks,
  stripeEvents,
} from "@/db/schema";
import type { Image } from "@/lib/catalog";

/** How long stock is held and the Checkout Session stays open. Stripe's minimum is 30 minutes. */
export const HOLD_MINUTES = 31;

/** Statuses that still hold stock. */
export const OPEN_STATUSES = ["pending", "processing"] as const satisfies readonly OrderStatus[];
/** Terminal statuses that give the stock back. */
export type ReleaseStatus = Extract<OrderStatus, "failed" | "expired" | "canceled">;

/** Thrown by createOrderWithHold when live stock no longer covers the order. */
export class OutOfStockError extends Error {
  constructor() {
    super("Stock no longer covers this order");
  }
}

/** Thrown by createOrderWithHold when the customer already has an open checkout (one per user). */
export class CheckoutInProgressError extends Error {
  constructor() {
    super("This customer already has an open checkout");
  }
}

// No 0/O or 1/I/L, so a reference read aloud or copied by hand can't be mistyped.
const REFERENCE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Public order number, e.g. AT-7K3M9Q2X (31^8 ≈ 850 billion; the column is unique anyway). */
export function newOrderReference(): string {
  let code = "";
  for (let i = 0; i < 8; i++) code += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
  return `AT-${code}`;
}

export type OrderLineInput = {
  productId: number;
  slug: string;
  name: string;
  colour: string;
  image: Image;
  unitPriceCents: number;
  quantity: number;
};

const pgError = (error: unknown): { code?: string; constraint?: string } => {
  const e = error as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } };
  return { code: e?.code ?? e?.cause?.code, constraint: e?.constraint ?? e?.cause?.constraint };
};

/**
 * Creates a pending order, its line snapshot and the stock hold in one transaction. Totals are
 * computed here from the server-side lines. Throws OutOfStockError if stock fell short.
 */
export async function createOrderWithHold(input: {
  reference: string;
  userId: string;
  lines: OrderLineInput[];
  expiresAt: Date;
}): Promise<{ id: number; totalCents: number }> {
  const { reference, userId, lines, expiresAt } = input;
  const subtotalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  const orderId = sql`(select ${orders.id} from ${orders} where ${orders.reference} = ${reference})`;

  try {
    const [inserted] = await db.batch([
      db
        .insert(orders)
        .values({ reference, userId, subtotalCents, totalCents: subtotalCents, expiresAt })
        .returning({ id: orders.id }),
      db.insert(orderItems).values(
        lines.map((line) => ({
          orderId,
          productId: line.productId,
          productSlug: line.slug,
          productName: line.name,
          colour: line.colour,
          image: line.image,
          unitPriceCents: line.unitPriceCents,
          quantity: line.quantity,
        })),
      ),
      // A missing stock row means 0. Materialise it as 0 so the update below covers every line
      // (an update alone would silently skip it); the batch then fails, so the row never persists.
      db.execute(sql`
        insert into ${stocks} (product_id, quantity)
        select oi.product_id, 0 from ${orderItems} oi where oi.order_id = ${orderId}
        on conflict (product_id) do nothing
      `),
      // Take the stock. A shortfall violates stocks_quantity_non_negative and rolls back the batch.
      db.execute(sql`
        update ${stocks} set quantity = ${stocks.quantity} - oi.quantity, updated_at = now()
        from ${orderItems} oi
        where oi.order_id = ${orderId} and ${stocks.productId} = oi.product_id
      `),
    ]);
    return { id: inserted[0].id, totalCents: subtotalCents };
  } catch (error) {
    const { code, constraint } = pgError(error);
    if (code === "23514") throw new OutOfStockError();
    if (code === "23505" && constraint === "orders_one_open_per_user") throw new CheckoutInProgressError();
    throw error;
  }
}

/** Links the Checkout Session to a still-pending order. False if the order was closed meanwhile. */
export async function attachCheckoutSession(orderId: number, sessionId: string): Promise<boolean> {
  const rows = await db
    .update(orders)
    .set({ stripeCheckoutSessionId: sessionId })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending")))
    .returning({ id: orders.id });
  return rows.length > 0;
}

/**
 * Closes an open order as `to` and returns its stock, in one statement. Returns whether this
 * call made the change (false: already closed, so nothing was returned twice).
 *
 * `unlinkedOnly`: only while no Checkout Session is attached, checked in the same statement. A
 * concurrent checkout may attach one after the caller looked; that order must not lose its hold
 * while its session can still be paid.
 */
export async function releaseOrder(
  orderId: number,
  to: ReleaseStatus,
  { unlinkedOnly = false }: { unlinkedOnly?: boolean } = {},
): Promise<boolean> {
  const unlinked = unlinkedOnly ? sql`and ${orders.stripeCheckoutSessionId} is null` : sql``;
  const result = await db.execute<{ released: number }>(sql`
    with closed as (
      update ${orders} set status = ${to}, updated_at = now()
      where ${orders.id} = ${orderId} and ${orders.status} in ('pending', 'processing') ${unlinked}
      returning ${orders.id} as id
    ), restocked as (
      update ${stocks} set quantity = ${stocks.quantity} + oi.quantity, updated_at = now()
      from ${orderItems} oi join closed on closed.id = oi.order_id
      where ${stocks.productId} = oi.product_id
      returning 1
    )
    select (select count(*) from closed)::int as released
  `);
  return Number(result.rows[0]?.released ?? 0) > 0;
}

// ── Webhook transitions ─────────────────────────────────────────────────
// Each is one guarded statement: it changes the order only from the statuses it allows, so a
// duplicate or out-of-order event finds nothing to change. Terminal statuses never move again.

/** The order a Checkout Session belongs to, by the reference we put in its metadata. */
export async function findOrderByReference(reference: string) {
  const [row] = await db
    .select({
      id: orders.id,
      status: orders.status,
      totalCents: orders.totalCents,
      currency: orders.currency,
      stripeCheckoutSessionId: orders.stripeCheckoutSessionId,
    })
    .from(orders)
    .where(eq(orders.reference, reference))
    .limit(1);
  return row;
}

/** pending → processing (session completed, payment not settled yet). Stock stays held. */
export async function markOrderProcessing(orderId: number, sessionId: string): Promise<boolean> {
  const rows = await db
    .update(orders)
    .set({ status: "processing", stripeCheckoutSessionId: sql`coalesce(${orders.stripeCheckoutSessionId}, ${sessionId})` })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending")))
    .returning({ id: orders.id });
  return rows.length > 0;
}

export type PaymentConfirmation = {
  sessionId: string;
  paymentIntentId: string | null;
  amountPaidCents: number;
  shipping: OrderShipping | null;
};

/**
 * pending|processing → paid, and the paid quantities leave the buyer's bag, in one statement.
 * The stock was already taken when the order was created, so it isn't touched here. Lines are
 * reduced by what was bought (deleted when that's all of them), so anything added to the bag
 * during checkout stays. Returns whether this call made the change.
 *
 * Only the bag line that was checked out is touched: one created before the order. A line removed
 * during checkout and added again later is a new row, so it's left alone. Reduce-or-delete is
 * decided on the line's current quantity (`ci.quantity`, re-checked on the latest row version if
 * a concurrent bag write got there first), never on a value read earlier in the statement.
 */
export async function markOrderPaid(orderId: number, payment: PaymentConfirmation): Promise<boolean> {
  const result = await db.execute<{ paid: number }>(sql`
    with paid as (
      update ${orders}
      set status = 'paid',
          paid_at = now(),
          amount_paid_cents = ${payment.amountPaidCents},
          stripe_payment_intent_id = coalesce(${payment.paymentIntentId}, ${orders.stripePaymentIntentId}),
          stripe_checkout_session_id = coalesce(${orders.stripeCheckoutSessionId}, ${payment.sessionId}),
          shipping = coalesce(${payment.shipping ? JSON.stringify(payment.shipping) : null}::jsonb, ${orders.shipping}),
          updated_at = now()
      where ${orders.id} = ${orderId} and ${orders.status} in ('pending', 'processing')
      returning ${orders.id} as id, ${orders.userId} as user_id, ${orders.createdAt} as ordered_at
    ), bought as (
      select ci.cart_id, ci.product_id, oi.quantity as bought
      from paid
      join ${carts} c on c.user_id = paid.user_id
      join ${orderItems} oi on oi.order_id = paid.id
      join ${cartItems} ci on ci.cart_id = c.id and ci.product_id = oi.product_id
      where ci.created_at <= paid.ordered_at
    ), reduced as (
      update ${cartItems} ci set quantity = ci.quantity - b.bought, updated_at = now()
      from bought b
      where ci.cart_id = b.cart_id and ci.product_id = b.product_id and ci.quantity > b.bought
      returning 1
    ), removed as (
      delete from ${cartItems} ci
      using bought b
      where ci.cart_id = b.cart_id and ci.product_id = b.product_id and ci.quantity <= b.bought
      returning 1
    )
    select (select count(*) from paid)::int as paid
  `);
  return Number(result.rows[0]?.paid ?? 0) > 0;
}

// ── Stripe event ledger ─────────────────────────────────────────────────

export async function isEventProcessed(eventId: string): Promise<boolean> {
  const [row] = await db.select({ id: stripeEvents.id }).from(stripeEvents).where(eq(stripeEvents.id, eventId)).limit(1);
  return row !== undefined;
}

/** Recorded only after an event was handled, so a crash mid-way is retried, not skipped. */
export async function recordEvent(eventId: string, type: string): Promise<void> {
  await db.insert(stripeEvents).values({ id: eventId, type }).onConflictDoNothing();
}

const openOrderFields = {
  id: orders.id,
  reference: orders.reference,
  status: orders.status,
  stripeCheckoutSessionId: orders.stripeCheckoutSessionId,
  expiresAt: orders.expiresAt,
};
export type OpenOrder = { id: number; reference: string; status: OrderStatus; stripeCheckoutSessionId: string | null; expiresAt: Date };

/** The user's orders that still hold stock, oldest first (at most one, by orders_one_open_per_user). */
export async function findOpenOrders(userId: string): Promise<OpenOrder[]> {
  return db
    .select(openOrderFields)
    .from(orders)
    .where(and(eq(orders.userId, userId), inArray(orders.status, [...OPEN_STATUSES])))
    .orderBy(asc(orders.createdAt));
}

/** The order again, if it is still open (re-read after a guarded update didn't apply). */
export async function findOpenOrderById(orderId: number): Promise<OpenOrder | undefined> {
  const [row] = await db
    .select(openOrderFields)
    .from(orders)
    .where(and(eq(orders.id, orderId), inArray(orders.status, [...OPEN_STATUSES])))
    .limit(1);
  return row;
}

/** A pending order of this user by its public reference (for cancelling from the return URL). */
export async function findPendingOrder(reference: string, userId: string): Promise<OpenOrder | undefined> {
  const [row] = await db
    .select(openOrderFields)
    .from(orders)
    .where(and(eq(orders.reference, reference), eq(orders.userId, userId), eq(orders.status, "pending")))
    .limit(1);
  return row;
}

/** Pending orders that never got a Checkout Session and whose hold has run out (for the sweep). */
export async function findExpiredUnlinkedOrders(graceMinutes: number): Promise<{ id: number; reference: string }[]> {
  return db
    .select({ id: orders.id, reference: orders.reference })
    .from(orders)
    .where(
      and(
        eq(orders.status, "pending"),
        sql`${orders.stripeCheckoutSessionId} is null`,
        sql`${orders.expiresAt} < now() - make_interval(mins => ${graceMinutes})`,
      ),
    );
}

export type OrderSummary = {
  reference: string;
  status: OrderStatus;
  totalCents: number;
  shipping: (typeof orders.$inferSelect)["shipping"];
  createdAt: Date;
  lines: { slug: string; name: string; colour: string; image: Image; unitPriceCents: number; quantity: number }[];
};

/** An order by its Checkout Session id, only if it belongs to `userId`. */
export async function findOrderBySession(sessionId: string, userId: string): Promise<OrderSummary | undefined> {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.stripeCheckoutSessionId, sessionId), eq(orders.userId, userId)))
    .limit(1);
  if (!order) return undefined;
  const lines = await db
    .select({
      slug: orderItems.productSlug,
      name: orderItems.productName,
      colour: orderItems.colour,
      image: orderItems.image,
      unitPriceCents: orderItems.unitPriceCents,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .orderBy(asc(orderItems.createdAt), asc(orderItems.productId));
  return {
    reference: order.reference,
    status: order.status,
    totalCents: order.totalCents,
    shipping: order.shipping,
    createdAt: order.createdAt,
    lines,
  };
}
