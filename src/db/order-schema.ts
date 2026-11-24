import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

import { users } from "./auth-schema";
import { MAX_PER_LINE } from "./cart-schema";
import { type ProductImage, products } from "./catalog-schema";

// Orders: users 1──< orders 1──< order_items >──1 products, plus stripe_events (webhook ledger).
// An order is created when checkout starts and holds its stock until it is paid, or until
// payment fails or expires. Prices are snapshotted on order_items, so an order never
// changes when the catalogue does. Stripe confirms payment; the client never sets a status.

/**
 * Order lifecycle. Only these transitions happen, each a guarded `where status in (…)` update:
 *   pending ──▶ processing ──▶ paid
 *      │            │
 *      ├────────────┴──▶ failed     (async payment failed; stock returned)
 *      ├──▶ expired                 (Checkout Session expired; stock returned)
 *      └──▶ canceled                (replaced by a new checkout or Stripe error; stock returned)
 * pending: stock held, payment page open. processing: session completed but payment not yet
 * settled (async methods); stock still held. paid, failed, expired, canceled: terminal.
 */
export const ORDER_STATUSES = ["pending", "processing", "paid", "failed", "expired", "canceled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Shipping details Stripe Checkout collected, copied onto the order when it's paid. */
export type OrderShipping = {
  name: string;
  phone: string | null;
  address: {
    line1: string;
    line2: string | null;
    city: string;
    state: string | null;
    postalCode: string;
    country: string;
  };
};

const statusList = sql.raw(ORDER_STATUSES.map((s) => `'${s}'`).join(", "));

export const orders = pgTable(
  "orders",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    /** Public order number (e.g. AT-7K3M9Q2X), used in URLs and emails instead of the id. */
    reference: text("reference").notNull().unique(),
    /** Checkout requires sign-in. Restrict: an account with orders can't be deleted outright. */
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: text("status").$type<OrderStatus>().notNull().default("pending"),
    /** ISO 4217, lower case as Stripe returns it. */
    currency: text("currency").notNull().default("usd"),
    subtotalCents: integer("subtotal_cents").notNull(),
    /** What Stripe is asked to charge (subtotal today; shipping is complimentary, no tax). */
    totalCents: integer("total_cents").notNull(),
    /** What Stripe reports was paid (`amount_total`); set when the order becomes paid. */
    amountPaidCents: integer("amount_paid_cents"),
    /** Set right after the session is created, so briefly null on a new pending order. */
    stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
    /** Known once Stripe has a PaymentIntent for the session (at payment). */
    stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
    shipping: jsonb("shipping").$type<OrderShipping>(),
    /** When the stock hold ends; the same instant is sent to Stripe as the session's expires_at. */
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("orders_user_id_idx").on(t.userId),
    // Reconciliation: open orders whose hold has run out.
    index("orders_status_expires_at_idx").on(t.status, t.expiresAt),
    check("orders_status_valid", sql`${t.status} in (${statusList})`),
    check("orders_currency_iso", sql`${t.currency} ~ '^[a-z]{3}$'`),
    check("orders_subtotal_cents_non_negative", sql`${t.subtotalCents} >= 0`),
    check("orders_total_cents_non_negative", sql`${t.totalCents} >= 0`),
    check("orders_amount_paid_cents_non_negative", sql`${t.amountPaidCents} >= 0`),
    check("orders_stripe_checkout_session_id_format", sql`${t.stripeCheckoutSessionId} like 'cs\\_%'`),
    check("orders_stripe_payment_intent_id_format", sql`${t.stripePaymentIntentId} like 'pi\\_%'`),
    // A paid order always records when, how much, and which Checkout Session paid it.
    check(
      "orders_paid_is_complete",
      sql`${t.status} <> 'paid' or (${t.paidAt} is not null and ${t.amountPaidCents} is not null and ${t.stripeCheckoutSessionId} is not null)`,
    ),
  ],
);

/** A snapshot of each bag line at checkout start: what was bought, at what price. */
export const orderItems = pgTable(
  "order_items",
  {
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    /** Restrict: a product that has been ordered can't be deleted (archive it instead). */
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    productSlug: text("product_slug").notNull(),
    productName: text("product_name").notNull(),
    colour: text("colour").notNull(),
    image: jsonb("image").$type<ProductImage>().notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.orderId, t.productId] }),
    index("order_items_product_id_idx").on(t.productId),
    check("order_items_unit_price_cents_non_negative", sql`${t.unitPriceCents} >= 0`),
    check("order_items_quantity_range", sql`${t.quantity} between 1 and ${sql.raw(String(MAX_PER_LINE))}`),
  ],
);

/**
 * Stripe webhook events already handled, by event id. Recorded after an event is processed,
 * so a crash mid-way is retried rather than skipped. The order status transitions are
 * idempotent anyway; this ledger just avoids redoing them.
 */
export const stripeEvents = pgTable(
  "stripe_events",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("stripe_events_id_format", sql`${t.id} like 'evt\\_%'`)],
);
