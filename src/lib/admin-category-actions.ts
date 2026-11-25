"use server";

// Admin category writes. Each starts with the admin check (`pnpm check:admin` enforces it),
// validates on the server, lets the database enforce the rest (unique slug; a category in use
// can't be deleted: products.category_id is ON DELETE RESTRICT), then refreshes the catalogue.

import { and, eq, ne, notExists, sql } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";

import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { CATEGORY_LIMITS, PRODUCT_SLUG_PATTERN, validateCategory } from "@/lib/admin-validation";
import { ADMIN_FORBIDDEN, getAdminForAction } from "@/lib/session";

export type CategoryFormState = {
  status: "idle" | "saved" | "error";
  errors?: Partial<Record<"name" | "slug", string>>;
  message?: string;
};
export type CategoryActionResult = { ok: true } | { ok: false; error: string };

const pgError = (error: unknown): { code?: string; constraint?: string } => {
  const e = error as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } };
  return { code: e?.code ?? e?.cause?.code, constraint: e?.constraint ?? e?.cause?.constraint };
};
const nameTaken = (name: string, exceptSlug?: string) =>
  db
    .select({ slug: categories.slug })
    .from(categories)
    .where(and(sql`lower(${categories.name}) = lower(${name})`, exceptSlug ? ne(categories.slug, exceptSlug) : undefined))
    .limit(1)
    .then((rows) => rows.length > 0);

/** Adds a category. Its web address (slug) is fixed afterwards: it's the category page's URL. */
export async function createCategory(_previous: CategoryFormState, form: FormData): Promise<CategoryFormState> {
  const admin = await getAdminForAction();
  if (!admin) return { status: "error", message: ADMIN_FORBIDDEN.error };

  const text = (key: string) => (typeof form.get(key) === "string" ? (form.get(key) as string) : "");
  const result = validateCategory({ name: text("name"), slug: text("slug") });
  if (result.errors) return { status: "error", errors: result.errors };
  const { name, slug } = result.data;

  try {
    if (await nameTaken(name)) return { status: "error", errors: { name: "A category with this name already exists." } };
    await db.insert(categories).values({ name, slug });
  } catch (error) {
    const { code, constraint } = pgError(error);
    if (code === "23505" && constraint === "categories_slug_unique") {
      return { status: "error", errors: { slug: "Another category already uses this web address." } };
    }
    console.error("createCategory failed", error);
    return { status: "error", message: "We couldn't add the category. Please try again." };
  }
  updateTag("products");
  refresh();
  return { status: "saved", message: `Added ${name}.` };
}

/** Renames a category (the name customers see). The web address doesn't change. */
export async function renameCategory(slug: string, name: string): Promise<CategoryActionResult> {
  const admin = await getAdminForAction();
  if (!admin) return ADMIN_FORBIDDEN;

  if (typeof slug !== "string" || !PRODUCT_SLUG_PATTERN.test(slug) || typeof name !== "string") {
    return { ok: false, error: "That isn't a valid request." };
  }
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Enter the category name." };
  if (trimmed.length > CATEGORY_LIMITS.name) return { ok: false, error: `Use ${CATEGORY_LIMITS.name} characters or fewer.` };

  try {
    if (await nameTaken(trimmed, slug)) return { ok: false, error: "A category with this name already exists." };
    const rows = await db.update(categories).set({ name: trimmed }).where(eq(categories.slug, slug)).returning({ slug: categories.slug });
    if (rows.length === 0) return { ok: false, error: "This category no longer exists." };
  } catch (error) {
    console.error("renameCategory failed", error);
    return { ok: false, error: "We couldn't rename the category. Please try again." };
  }
  updateTag("products");
  refresh();
  return { ok: true };
}

/** Deletes a category only while no product uses it (checked in the same statement, and by the FK). */
export async function deleteCategory(slug: string): Promise<CategoryActionResult> {
  const admin = await getAdminForAction();
  if (!admin) return ADMIN_FORBIDDEN;

  if (typeof slug !== "string" || !PRODUCT_SLUG_PATTERN.test(slug)) return { ok: false, error: "That isn't a valid request." };

  const inUse = async () => {
    const [row] = await db
      .select({ count: sql<number>`count(${products.id})`.mapWith(Number) })
      .from(categories)
      .leftJoin(products, eq(products.categoryId, categories.id))
      .where(eq(categories.slug, slug))
      .groupBy(categories.id);
    return row?.count;
  };

  try {
    const rows = await db
      .delete(categories)
      .where(and(eq(categories.slug, slug), notExists(db.select().from(products).where(eq(products.categoryId, categories.id)))))
      .returning({ slug: categories.slug });
    if (rows.length === 0) {
      const count = await inUse();
      if (count === undefined) return { ok: false, error: "This category no longer exists." };
      return { ok: false, error: `${count} ${count === 1 ? "product uses" : "products use"} this category. Move or hide them first.` };
    }
  } catch (error) {
    if (pgError(error).code === "23001") {
      const count = (await inUse()) ?? 0;
      return { ok: false, error: `${count} ${count === 1 ? "product uses" : "products use"} this category. Move or hide them first.` };
    }
    console.error("deleteCategory failed", error);
    return { ok: false, error: "We couldn't delete the category. Please try again." };
  }
  updateTag("products");
  refresh();
  return { ok: true };
}
