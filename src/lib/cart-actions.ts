"use server";

// Shopping-bag writes. Server Functions are public POST endpoints, so each one:
//   1. validates its input (slug pattern, integer quantity in range),
//   2. acts only on the caller's own bag: the signed-in user's, or the guest bag in the httpOnly
//      cookie. A cart id never comes from the client,
//   3. reads stock live and lets SQL clamp the quantity (src/lib/cart-store.ts),
//   4. ends with refresh(), so the bag page and header count re-render in the same round trip.
// Prices never come from the client; the bag always shows the product's current price.

import { refresh } from "next/cache";
import { cookies } from "next/headers";

import {
  addLine,
  CART_COOKIE,
  CART_COOKIE_MAX_AGE,
  createGuestCart,
  deleteLine,
  findGuestCartId,
  findProductForCart,
  getLineQuantity,
  getOrCreateUserCartId,
  MAX_PER_LINE,
  mergeGuestCartIntoUser,
  newCartToken,
  setLine,
  SLUG_PATTERN,
} from "@/lib/cart-store";
import { getSignedInUser } from "@/lib/session";

export type BagActionResult =
  | { ok: true; quantity: number; available: number; limited: boolean }
  | { ok: false; error: string };

const GENERIC_ERROR = "We couldn't update your bag. Please try again.";
const fail = (error: string): BagActionResult => ({ ok: false, error });

const validSlug = (slug: unknown): slug is string => typeof slug === "string" && SLUG_PATTERN.test(slug);
const validQuantity = (quantity: unknown, min: number): quantity is number =>
  typeof quantity === "number" && Number.isInteger(quantity) && quantity >= min && quantity <= MAX_PER_LINE;

/** The caller's cart for writing: created on first use (guests get the cookie here). */
async function cartIdForWrite(): Promise<number> {
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;
  const user = await getSignedInUser();

  if (user) {
    // Normally merged by the sign-in hook; this catches a guest bag that slipped through.
    if (token) {
      await mergeGuestCartIntoUser(token, user.id);
      store.delete(CART_COOKIE);
    }
    return getOrCreateUserCartId(user.id);
  }

  const existing = token ? await findGuestCartId(token) : undefined;
  if (existing !== undefined) return existing;

  const fresh = newCartToken();
  const id = await createGuestCart(fresh);
  store.set(CART_COOKIE, fresh, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE,
  });
  return id;
}

/** Adds `quantity` units (default 1), never past live stock or MAX_PER_LINE. */
export async function addToBag(slug: string, quantity = 1): Promise<BagActionResult> {
  if (!validSlug(slug) || !validQuantity(quantity, 1)) return fail("That isn't a valid request.");
  try {
    const product = await findProductForCart(slug);
    if (!product) return fail("This piece is no longer available.");
    if (product.available === 0) return fail("This piece is out of stock.");

    const cartId = await cartIdForWrite();
    const before = await getLineQuantity(cartId, product.id);
    const stored = await addLine(cartId, product.id, quantity);
    if (stored === 0) return fail("This piece has just sold out.");

    refresh();
    return { ok: true, quantity: stored, available: product.available, limited: stored < before + quantity };
  } catch (error) {
    console.error("addToBag failed", error);
    return fail(GENERIC_ERROR);
  }
}

/** Sets a line's quantity (0 removes it), clamped to live stock and MAX_PER_LINE. */
export async function updateBagQuantity(slug: string, quantity: number): Promise<BagActionResult> {
  if (!validSlug(slug) || !validQuantity(quantity, 0)) return fail("That isn't a valid request.");
  try {
    const product = await findProductForCart(slug);
    if (!product) return fail("This piece is no longer available.");

    const stored = await setLine(await cartIdForWrite(), product.id, quantity);
    refresh();
    return { ok: true, quantity: stored, available: product.available, limited: stored < quantity };
  } catch (error) {
    console.error("updateBagQuantity failed", error);
    return fail(GENERIC_ERROR);
  }
}

export async function removeFromBag(slug: string): Promise<BagActionResult> {
  if (!validSlug(slug)) return fail("That isn't a valid request.");
  try {
    const product = await findProductForCart(slug);
    if (product) await deleteLine(await cartIdForWrite(), product.id);
    refresh();
    return { ok: true, quantity: 0, available: product?.available ?? 0, limited: false };
  } catch (error) {
    console.error("removeFromBag failed", error);
    return fail(GENERIC_ERROR);
  }
}
