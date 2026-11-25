// Shopping-bag database access. Plain functions, no Next.js APIs and no "server-only": src/lib/auth.ts
// imports mergeGuestCartIntoUser for its sign-in hook, and the Better Auth CLI loads auth.ts.
// Callers resolve *which* cart (src/lib/cart.ts, src/lib/cart-actions.ts); this module never trusts
// a cart id from a client.
//
// Stock is always read live from `stocks` (never the cached catalogue), and every write clamps the
// quantity to min(stock, MAX_PER_LINE) inside the same SQL statement, so concurrent requests can't
// overshoot. The Neon HTTP driver has no transactions; each step below is one statement.

import { randomBytes } from "node:crypto";

import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { cartItems, carts, categories, MAX_PER_LINE, products, stocks } from "@/db/schema";
import type { Image } from "@/lib/catalog";

export { MAX_PER_LINE };

/** httpOnly cookie holding a guest bag's token. */
export const CART_COOKIE = "atelier_cart";
export const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 60; // 60 days
export const SLUG_PATTERN = /^[a-z0-9-]{1,100}$/;

/** 256-bit random, URL-safe: unguessable, so possessing it is the authorization for a guest bag. */
export const newCartToken = () => randomBytes(32).toString("base64url");

/** min(stock, MAX_PER_LINE) for a product id expression, read live; 0 for a hidden product. */
const availableFor = (productId: unknown) =>
  sql`case when exists (select 1 from ${products} where ${products.id} = ${productId} and ${products.status} = 'active')
    then least(coalesce((select ${stocks.quantity} from ${stocks} where ${stocks.productId} = ${productId}), 0), ${MAX_PER_LINE})
    else 0 end`;

/** Live availability for a row already joined to products and (left) stocks. 0 when hidden. */
const joinedAvailable = sql<number>`case when ${products.status} = 'active' then least(coalesce(${stocks.quantity}, 0), ${MAX_PER_LINE}) else 0 end`;

// ── Carts ────────────────────────────────────────────────────────────────

/** A guest bag: matches the token *and* has no user, so a leftover cookie never opens an account bag. */
export async function findGuestCartId(token: string): Promise<number | undefined> {
  const [row] = await db
    .select({ id: carts.id })
    .from(carts)
    .where(and(eq(carts.token, token), isNull(carts.userId)))
    .limit(1);
  return row?.id;
}

export async function findUserCartId(userId: string): Promise<number | undefined> {
  const [row] = await db.select({ id: carts.id }).from(carts).where(eq(carts.userId, userId)).limit(1);
  return row?.id;
}

export async function createGuestCart(token: string): Promise<number> {
  const [row] = await db.insert(carts).values({ token }).returning({ id: carts.id });
  return row.id;
}

/** The user's bag, created on first use (one statement, safe under concurrent requests). */
export async function getOrCreateUserCartId(userId: string): Promise<number> {
  const [row] = await db
    .insert(carts)
    .values({ userId })
    .onConflictDoUpdate({ target: carts.userId, set: { updatedAt: sql`now()` } })
    .returning({ id: carts.id });
  return row.id;
}

/**
 * Moves a guest bag into the user's bag: quantities add up per product, clamped to stock and
 * MAX_PER_LINE; sold-out products are dropped. Then the guest bag is deleted (lines cascade).
 * Returns whether there was a guest bag to merge.
 */
export async function mergeGuestCartIntoUser(token: string, userId: string): Promise<boolean> {
  const guestId = await findGuestCartId(token);
  if (guestId === undefined) return false;
  const userCartId = await getOrCreateUserCartId(userId);
  await db.execute(sql`
    insert into ${cartItems} (cart_id, product_id, quantity)
    select ${userCartId}, g.product_id, least(g.quantity, ${availableFor(sql`g.product_id`)})
    from ${cartItems} g
    where g.cart_id = ${guestId} and ${availableFor(sql`g.product_id`)} > 0
    on conflict (cart_id, product_id) do update
      set quantity = least(${cartItems.quantity} + excluded.quantity, ${availableFor(sql`excluded.product_id`)}),
          updated_at = now()
  `);
  await db.delete(carts).where(eq(carts.id, guestId));
  return true;
}

// ── Lines ────────────────────────────────────────────────────────────────

/**
 * Product id and live stock for a slug (uncached: the catalogue cache can be a minute old).
 * A hidden product is treated as not existing, so it can't be added.
 */
export async function findProductForCart(slug: string): Promise<{ id: number; available: number } | undefined> {
  const [row] = await db
    .select({ id: products.id, available: sql<number>`${availableFor(products.id)}`.mapWith(Number) })
    .from(products)
    .where(and(eq(products.slug, slug), eq(products.status, "active")))
    .limit(1);
  return row;
}

/** Product id for a slug whatever its status: removing a line must work for hidden products too. */
export async function findProductIdForRemoval(slug: string): Promise<number | undefined> {
  const [row] = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
  return row?.id;
}

export async function getLineQuantity(cartId: number, productId: number): Promise<number> {
  const [row] = await db
    .select({ quantity: cartItems.quantity })
    .from(cartItems)
    .where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)))
    .limit(1);
  return row?.quantity ?? 0;
}

/**
 * Adds `requested` units. New quantity = min(current + requested, stock, MAX_PER_LINE).
 * Returns the stored quantity, or 0 if the product is sold out (nothing written; an existing
 * line is removed, since it can't be bought).
 */
export async function addLine(cartId: number, productId: number, requested: number): Promise<number> {
  const rows = await db.execute<{ quantity: number }>(sql`
    insert into ${cartItems} (cart_id, product_id, quantity)
    select ${cartId}, ${productId}, least(${requested}, a.available)
    from (select ${availableFor(productId)} as available) a
    where a.available > 0
    on conflict (cart_id, product_id) do update
      set quantity = least(${cartItems.quantity} + ${requested}, ${availableFor(productId)}),
          updated_at = now()
    returning quantity
  `);
  const quantity = Number(rows.rows[0]?.quantity ?? 0);
  if (quantity === 0) await deleteLine(cartId, productId);
  return quantity;
}

/** Sets the quantity, clamped to min(stock, MAX_PER_LINE). 0 (or sold out) removes the line. */
export async function setLine(cartId: number, productId: number, requested: number): Promise<number> {
  if (requested <= 0) {
    await deleteLine(cartId, productId);
    return 0;
  }
  const rows = await db.execute<{ quantity: number }>(sql`
    insert into ${cartItems} (cart_id, product_id, quantity)
    select ${cartId}, ${productId}, least(${requested}, a.available)
    from (select ${availableFor(productId)} as available) a
    where a.available > 0
    on conflict (cart_id, product_id) do update
      set quantity = least(${requested}, ${availableFor(productId)}),
          updated_at = now()
    returning quantity
  `);
  const quantity = Number(rows.rows[0]?.quantity ?? 0);
  if (quantity === 0) await deleteLine(cartId, productId);
  return quantity;
}

export async function deleteLine(cartId: number, productId: number): Promise<void> {
  await db.delete(cartItems).where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)));
}

/** A bag line as stored, joined with live product data (price, stock). */
export type CartRow = {
  /** Server-side only (order snapshots); the UI identifies products by slug. */
  productId: number;
  slug: string;
  name: string;
  categorySlug: string;
  categoryName: string;
  colour: string;
  image: Image;
  unitPriceCents: number;
  quantity: number;
  /** min(stock, MAX_PER_LINE) right now. */
  available: number;
};

export async function readLines(cartId: number): Promise<CartRow[]> {
  const rows = await db
    .select({
      productId: products.id,
      slug: products.slug,
      name: products.name,
      categorySlug: categories.slug,
      categoryName: categories.name,
      colour: products.colour,
      images: products.images,
      unitPriceCents: products.priceCents,
      quantity: cartItems.quantity,
      available: joinedAvailable.mapWith(Number),
    })
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(stocks, eq(stocks.productId, products.id))
    .where(eq(cartItems.cartId, cartId))
    .orderBy(asc(cartItems.createdAt), asc(cartItems.productId));
  return rows.map(({ images, ...row }) => ({ ...row, image: images[0] }));
}

/** Units the bag can actually deliver right now (each line clamped to live stock). */
export async function countItems(cartId: number): Promise<number> {
  const [row] = await db
    .select({
      count: sql<number>`coalesce(sum(least(${cartItems.quantity}, ${joinedAvailable})), 0)`.mapWith(Number),
    })
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .leftJoin(stocks, eq(stocks.productId, cartItems.productId))
    .where(eq(cartItems.cartId, cartId));
  return row?.count ?? 0;
}
