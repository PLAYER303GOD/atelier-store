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
import { type OrderStatus, orderItems, orders, stocks } from "@/db/schema";
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

const errorCode = (error: unknown): string | undefined => {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code ?? e?.cause?.code;
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
      // Take the stock. A shortfall violates stocks_quantity_non_negative and rolls back the batch.
      db.execute(sql`
        update ${stocks} set quantity = ${stocks.quantity} - oi.quantity, updated_at = now()
        from ${orderItems} oi
        where oi.order_id = ${orderId} and ${stocks.productId} = oi.product_id
      `),
    ]);
    return { id: inserted[0].id, totalCents: subtotalCents };
  } catch (error) {
    if (errorCode(error) === "23514") throw new OutOfStockError();
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
 */
export async function releaseOrder(orderId: number, to: ReleaseStatus): Promise<boolean> {
  const result = await db.execute<{ released: number }>(sql`
    with closed as (
      update ${orders} set status = ${to}, updated_at = now()
      where ${orders.id} = ${orderId} and ${orders.status} in ('pending', 'processing')
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

/** The user's orders that still hold stock, oldest first. */
export async function findOpenOrders(userId: string) {
  return db
    .select({ id: orders.id, status: orders.status, stripeCheckoutSessionId: orders.stripeCheckoutSessionId })
    .from(orders)
    .where(and(eq(orders.userId, userId), inArray(orders.status, [...OPEN_STATUSES])))
    .orderBy(asc(orders.createdAt));
}

/** A pending order of this user by its public reference (for cancelling from the return URL). */
export async function findPendingOrder(reference: string, userId: string) {
  const [row] = await db
    .select({ id: orders.id, stripeCheckoutSessionId: orders.stripeCheckoutSessionId })
    .from(orders)
    .where(and(eq(orders.reference, reference), eq(orders.userId, userId), eq(orders.status, "pending")))
    .limit(1);
  return row;
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
