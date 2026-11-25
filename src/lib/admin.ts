// Admin reads (server-only). Uncached on purpose: admins need live stock, holds and statuses,
// and these pages render per request behind requireAdmin() anyway. Includes hidden products.

import "server-only";

import { asc, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { categories, orderItems, orders, type ProductImage, type ProductStatus, products, stocks } from "@/db/schema";

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
