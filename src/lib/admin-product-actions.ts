"use server";

// Admin product writes. Server Actions are public POST endpoints, so each one:
//   1. starts with the admin check (getAdminForAction; `pnpm check:admin` enforces it),
//   2. reads only the form fields it expects and validates them here (validateProduct),
//   3. writes with the database enforcing the rest (unique slug, prices >= 0, stock >= 0),
//   4. refreshes the catalogue cache (updateTag("products")) so the store shows it at once.

import { and, eq, sql } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { categories, products, stocks } from "@/db/schema";
import {
  type ProductFieldErrors,
  productFormValuesFromFormData,
  PRODUCT_SLUG_PATTERN,
  validateProduct,
} from "@/lib/admin-validation";
import { ADMIN_FORBIDDEN, getAdminForAction } from "@/lib/session";

export type ProductFormState = {
  status: "idle" | "saved" | "error";
  errors?: ProductFieldErrors;
  /** Form-level message (not tied to one field). */
  message?: string;
  /** After a save: the product's new updated_at, for the next save's stale check. */
  updatedAt?: string;
};

const forbidden = (): ProductFormState => ({ status: "error", message: ADMIN_FORBIDDEN.error });
const failed = (message: string, errors?: ProductFieldErrors): ProductFormState => ({ status: "error", message, errors });
const GENERIC = "We couldn't save the product. Please try again.";

const pgError = (error: unknown): { code?: string; constraint?: string } => {
  const e = error as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } };
  return { code: e?.code ?? e?.cause?.code, constraint: e?.constraint ?? e?.cause?.constraint };
};

async function categoryIdFor(slug: string): Promise<number | undefined> {
  const [row] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, slug)).limit(1);
  return row?.id;
}

/** Creates a product and its stock row together, then opens it for editing. */
export async function createProduct(_previous: ProductFormState, form: FormData): Promise<ProductFormState> {
  const admin = await getAdminForAction();
  if (!admin) return forbidden();

  const result = validateProduct(productFormValuesFromFormData(form), "create");
  if (result.errors) return failed("Please fix the highlighted fields.", result.errors);
  const input = result.data;

  try {
    const categoryId = await categoryIdFor(input.categorySlug);
    if (categoryId === undefined) return failed("Please fix the highlighted fields.", { categorySlug: "That category no longer exists." });

    const productId = sql`(select ${products.id} from ${products} where ${products.slug} = ${input.slug})`;
    await db.batch([
      db.insert(products).values({
        slug: input.slug,
        name: input.name,
        categoryId,
        priceCents: input.priceCents,
        colour: input.colour,
        description: input.description,
        details: input.details,
        images: input.images,
        badge: input.badge,
        status: input.status,
      }),
      db.insert(stocks).values({ productId, quantity: input.initialStock }),
    ]);
  } catch (error) {
    const { code, constraint } = pgError(error);
    if (code === "23505" && constraint === "products_slug_unique") {
      return failed("Please fix the highlighted fields.", { slug: "Another product already uses this web address." });
    }
    console.error("createProduct failed", error);
    return failed(GENERIC);
  }

  updateTag("products");
  redirect(`/admin/products/edit?product=${input.slug}&created=1`); // outside try: works by throwing
}

/**
 * Saves edits to an existing product. The slug can't change (orders, saved items and links use
 * it). Refused if someone saved the product after this form was opened (updated_at check).
 */
export async function updateProduct(_previous: ProductFormState, form: FormData): Promise<ProductFormState> {
  const admin = await getAdminForAction();
  if (!admin) return forbidden();

  const values = productFormValuesFromFormData(form);
  const expected = form.get("updatedAt");
  if (!PRODUCT_SLUG_PATTERN.test(values.slug) || typeof expected !== "string" || Number.isNaN(Date.parse(expected))) {
    return failed("That isn't a valid request.");
  }
  const result = validateProduct(values, "edit");
  if (result.errors) return failed("Please fix the highlighted fields.", result.errors);
  const input = result.data;

  try {
    const categoryId = await categoryIdFor(input.categorySlug);
    if (categoryId === undefined) return failed("Please fix the highlighted fields.", { categorySlug: "That category no longer exists." });

    const [saved] = await db
      .update(products)
      .set({
        name: input.name,
        categoryId,
        priceCents: input.priceCents,
        colour: input.colour,
        description: input.description,
        details: input.details,
        images: input.images,
        badge: input.badge,
        status: input.status,
      })
      .where(
        and(
          eq(products.slug, input.slug),
          // Millisecond precision on both sides (JS dates have no microseconds).
          sql`date_trunc('milliseconds', ${products.updatedAt}) = ${expected}::timestamptz`,
        ),
      )
      .returning({ updatedAt: products.updatedAt });

    if (!saved) {
      const [exists] = await db.select({ id: products.id }).from(products).where(eq(products.slug, input.slug)).limit(1);
      return failed(
        exists
          ? "Someone saved this product after you opened it. Reload the page to see their changes, then edit again."
          : "This product no longer exists.",
      );
    }

    updateTag("products");
    refresh();
    return { status: "saved", updatedAt: saved.updatedAt.toISOString() };
  } catch (error) {
    console.error("updateProduct failed", error);
    return failed(GENERIC);
  }
}

export type StockAdjustResult = { ok: true; stock: number } | { ok: false; error: string };

/**
 * Adds (or removes, if negative) units of stock, atomically: `quantity + delta` in one statement,
 * so it can't overwrite a checkout holding units at the same moment. Never below 0 (the
 * stocks_quantity_non_negative check). A product without a stock row gets one.
 */
export async function adjustProductStock(slug: string, delta: number): Promise<StockAdjustResult> {
  const admin = await getAdminForAction();
  if (!admin) return ADMIN_FORBIDDEN;

  if (typeof slug !== "string" || !PRODUCT_SLUG_PATTERN.test(slug)) return { ok: false, error: "That isn't a valid request." };
  if (typeof delta !== "number" || !Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 1000) {
    return { ok: false, error: "Enter a whole number between -1000 and 1000, other than 0." };
  }

  try {
    const result = await db.execute<{ quantity: number }>(sql`
      insert into ${stocks} (product_id, quantity)
      select ${products.id}, ${delta} from ${products} where ${products.slug} = ${slug}
      on conflict (product_id) do update
        set quantity = ${stocks.quantity} + excluded.quantity, updated_at = now()
      returning quantity
    `);
    const row = result.rows[0];
    if (!row) return { ok: false, error: "This product no longer exists." };
    updateTag("products");
    refresh();
    return { ok: true, stock: Number(row.quantity) };
  } catch (error) {
    if (pgError(error).code === "23514") {
      const [current] = await db
        .select({ quantity: sql<number>`coalesce(${stocks.quantity}, 0)`.mapWith(Number) })
        .from(products)
        .leftJoin(stocks, eq(stocks.productId, products.id))
        .where(eq(products.slug, slug))
        .limit(1);
      const available = current?.quantity ?? 0;
      return { ok: false, error: `Only ${available} available to remove.` };
    }
    console.error("adjustProductStock failed", error);
    return { ok: false, error: "We couldn't update the stock. Please try again." };
  }
}
