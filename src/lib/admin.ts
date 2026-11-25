// Admin reads (server-only). Uncached on purpose: admins need live stock, holds and statuses,
// and these pages render per request behind requireAdmin() anyway. Includes hidden products.

import "server-only";

import { asc, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  categories,
  orderItems,
  orders,
  type OrderStatus,
  type ProductImage,
  type ProductStatus,
  products,
  stocks,
  users,
} from "@/db/schema";
import { findOrderSummaryByReference, type OrderSummary } from "@/lib/order-store";

/** Units of a product held by open checkouts (pending / processing orders). */
const heldFor = sql<number>`(
  select coalesce(sum(oi.quantity), 0) from ${orderItems} oi
  join ${orders} o on o.id = oi.order_id
  where oi.product_id = ${products.id} and o.status in ('pending', 'processing')
)`.mapWith(Number);

const stockOf = sql<number>`coalesce(${stocks.quantity}, 0)`.mapWith(Number);

export type AdminProductRow = {
  slug: string;
  name: string;
  category: string;
  priceCents: number;
  status: ProductStatus;
  /** Available to sell now (holds already taken out). */
  stock: number;
  /** Held in open checkouts; comes back if they aren't paid. */
  held: number;
  image: ProductImage;
};

/** Every product, hidden ones included, newest first. */
export async function listAdminProducts(): Promise<AdminProductRow[]> {
  const rows = await db
    .select({
      slug: products.slug,
      name: products.name,
      category: categories.name,
      priceCents: products.priceCents,
      status: products.status,
      stock: stockOf,
      held: heldFor,
      images: products.images,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(stocks, eq(stocks.productId, products.id))
    .orderBy(desc(products.createdAt), asc(products.id));
  return rows.map(({ images, ...row }) => ({ ...row, image: images[0] }));
}

export type AdminProduct = {
  slug: string;
  name: string;
  categorySlug: string;
  priceCents: number;
  colour: string;
  description: string;
  details: string[];
  badge: string | null;
  status: ProductStatus;
  images: ProductImage[];
  stock: number;
  held: number;
  /** ISO, millisecond precision: the edit form sends it back so a stale save is refused. */
  updatedAt: string;
};

export async function getAdminProduct(slug: string): Promise<AdminProduct | undefined> {
  const [row] = await db
    .select({
      slug: products.slug,
      name: products.name,
      categorySlug: categories.slug,
      priceCents: products.priceCents,
      colour: products.colour,
      description: products.description,
      details: products.details,
      badge: products.badge,
      status: products.status,
      images: products.images,
      stock: stockOf,
      held: heldFor,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(stocks, eq(stocks.productId, products.id))
    .where(eq(products.slug, slug))
    .limit(1);
  return row && { ...row, updatedAt: row.updatedAt.toISOString() };
}

/** Categories for the product form's select, A–Z. */
export async function listCategoryOptions(): Promise<{ slug: string; name: string }[]> {
  return db.select({ slug: categories.slug, name: categories.name }).from(categories).orderBy(asc(categories.name));
}

export type AdminCategoryRow = { slug: string; name: string; products: number; hidden: number };

/** Every category, A–Z, with how many products use it (hidden ones counted separately). */
export async function listCategoriesWithCounts(): Promise<AdminCategoryRow[]> {
  return db
    .select({
      slug: categories.slug,
      name: categories.name,
      products: sql<number>`count(${products.id})`.mapWith(Number),
      hidden: sql<number>`count(${products.id}) filter (where ${products.status} = 'hidden')`.mapWith(Number),
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.name));
}

// ── Orders ──────────────────────────────────────────────────────────────

export const ADMIN_ORDER_LIMIT = 100;

export type AdminOrderRow = {
  reference: string;
  status: OrderStatus;
  totalCents: number;
  createdAt: Date;
  customerName: string;
  customerEmail: string;
  itemCount: number;
};

/** The latest orders across all customers (optionally one status), newest first. */
export async function listAllOrders(status?: OrderStatus): Promise<AdminOrderRow[]> {
  return db
    .select({
      reference: orders.reference,
      status: orders.status,
      totalCents: orders.totalCents,
      createdAt: orders.createdAt,
      customerName: users.name,
      customerEmail: users.email,
      itemCount: sql<number>`(select coalesce(sum(oi.quantity), 0) from ${orderItems} oi where oi.order_id = ${orders.id})`.mapWith(Number),
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .where(status ? eq(orders.status, status) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(ADMIN_ORDER_LIMIT);
}

/** How many orders are in each status (for the filter tabs). */
export async function countOrdersByStatus(): Promise<Partial<Record<OrderStatus, number>>> {
  const rows = await db
    .select({ status: orders.status, count: sql<number>`count(*)`.mapWith(Number) })
    .from(orders)
    .groupBy(orders.status);
  return Object.fromEntries(rows.map((row) => [row.status, row.count]));
}

export type AdminOrder = OrderSummary & {
  customerName: string;
  customerEmail: string;
  amountPaidCents: number | null;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  expiresAt: Date;
};

/** Any customer's order by reference, with its customer and Stripe ids. Admin pages only. */
export async function getAdminOrder(reference: string): Promise<AdminOrder | undefined> {
  const [order] = await db
    .select({
      customerName: users.name,
      customerEmail: users.email,
      amountPaidCents: orders.amountPaidCents,
      stripeCheckoutSessionId: orders.stripeCheckoutSessionId,
      stripePaymentIntentId: orders.stripePaymentIntentId,
      expiresAt: orders.expiresAt,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .where(eq(orders.reference, reference))
    .limit(1);
  if (!order) return undefined;
  const summary = await findOrderSummaryByReference(reference);
  return summary && { ...summary, ...order };
}
