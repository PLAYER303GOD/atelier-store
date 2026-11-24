// Reading the shopping bag (server-only). Writes are Server Actions in src/lib/cart-actions.ts.
//
// Owner rules: signed in → the account's bag (carts.user_id); signed out → the guest bag whose
// token is in the httpOnly `atelier_cart` cookie and has no user. A guest bag is merged into the
// account bag at sign-in (Better Auth hook in src/lib/auth.ts).
//
// Reads are request data (cookie + session) and never cached: call them inside <Suspense>.
// Rendering never writes; if stock fell since a line was added, the line is reported as reduced
// or unavailable and the next write stores the corrected quantity.

import "server-only";

import { cookies } from "next/headers";

import { CART_COOKIE, type CartRow, countItems, findGuestCartId, findUserCartId, readLines } from "@/lib/cart-store";
import type { Image } from "@/lib/catalog";
import { getSignedInUser } from "@/lib/session";

export type BagLine = {
  slug: string;
  name: string;
  category: { slug: string; name: string };
  colour: string;
  image: Image;
  unitPriceCents: number;
  /** min(live stock, MAX_PER_LINE). */
  available: number;
  /** What the bag can deliver: min(stored quantity, available). */
  quantity: number;
  lineTotalCents: number;
  /** "reduced": stock fell below the stored quantity. "unavailable": sold out since added. */
  status: "ok" | "reduced" | "unavailable";
};

export type Bag = {
  lines: BagLine[];
  itemCount: number;
  subtotalCents: number;
  /**
   * What the bag showed: each line's slug, quantity and unit price. The checkout form posts it
   * back so checkout can refuse if anything changed since the page rendered. It is only compared,
   * never used for pricing, so a tampered value can at worst make checkout refuse.
   */
  signature: string;
};

const EMPTY_BAG: Bag = { lines: [], itemCount: 0, subtotalCents: 0, signature: "" };

/** The current visitor's cart id, without creating anything. */
async function currentCartId(): Promise<number | undefined> {
  const user = await getSignedInUser();
  if (user) return findUserCartId(user.id);
  const token = (await cookies()).get(CART_COOKIE)?.value;
  return token ? findGuestCartId(token) : undefined;
}

/** The bag with live prices and stock; totals computed here, in integer cents. */
export async function getBag(): Promise<Bag> {
  const cartId = await currentCartId();
  if (cartId === undefined) return EMPTY_BAG;
  return toBag(await readLines(cartId));
}

/** Stored lines → what the bag can deliver now. Shared by the bag page and checkout. */
export function toBag(rows: CartRow[]): Bag {
  const lines = rows.map((row): BagLine => {
    const quantity = Math.min(row.quantity, row.available);
    return {
      slug: row.slug,
      name: row.name,
      category: { slug: row.categorySlug, name: row.categoryName },
      colour: row.colour,
      image: row.image,
      unitPriceCents: row.unitPriceCents,
      available: row.available,
      quantity,
      lineTotalCents: row.unitPriceCents * quantity,
      status: row.available === 0 ? "unavailable" : quantity < row.quantity ? "reduced" : "ok",
    };
  });

  return {
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotalCents: lines.reduce((sum, line) => sum + line.lineTotalCents, 0),
    signature: lines.map((line) => `${line.slug}:${line.quantity}:${line.unitPriceCents}`).join("|"),
  };
}

/** Units in the bag (for the header badge). */
export async function getBagCount(): Promise<number> {
  const cartId = await currentCartId();
  return cartId === undefined ? 0 : countItems(cartId);
}
