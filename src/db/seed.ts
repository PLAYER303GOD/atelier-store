// Loads the sample catalogue. Safe to re-run: every insert upserts on its natural key.
// Run with `pnpm db:seed` (reads DATABASE_URL from .env.local).

import { sql } from "drizzle-orm";

import { db } from "./index";
import { categories, products, stocks } from "./schema";
import { seedCategories, seedProducts } from "./seed-data";

const excluded = (column: string) => sql.raw(`excluded.${column}`);

async function main() {
  const categoryRows = await db
    .insert(categories)
    .values([...seedCategories])
    .onConflictDoUpdate({ target: categories.slug, set: { name: excluded("name") } })
    .returning({ id: categories.id, slug: categories.slug });
  const categoryId = new Map(categoryRows.map((row) => [row.slug, row.id]));

  // Newest first in the seed list; one minute apart keeps "New arrivals" in that order.
  const now = Date.now();
  const productRows = await db
    .insert(products)
    .values(
      seedProducts.map((p, i) => ({
        slug: p.slug,
        name: p.name,
        categoryId: categoryId.get(p.category)!,
        priceCents: p.priceCents,
        colour: p.colour,
        description: p.description,
        details: p.details,
        images: p.images,
        badge: p.badge ?? null,
        createdAt: new Date(now - i * 60_000),
      })),
    )
    .onConflictDoUpdate({
      target: products.slug,
      set: {
        name: excluded("name"),
        categoryId: excluded("category_id"),
        priceCents: excluded("price_cents"),
        colour: excluded("colour"),
        description: excluded("description"),
        details: excluded("details"),
        images: excluded("images"),
        badge: excluded("badge"),
        createdAt: excluded("created_at"),
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: products.id, slug: products.slug });
  const productId = new Map(productRows.map((row) => [row.slug, row.id]));

  await db
    .insert(stocks)
    .values(seedProducts.map((p) => ({ productId: productId.get(p.slug)!, quantity: p.stock })))
    .onConflictDoUpdate({
      target: stocks.productId,
      set: { quantity: excluded("quantity"), updatedAt: sql`now()` },
    });

  console.log(
    `Seeded ${categoryRows.length} categories, ${productRows.length} products, ${seedProducts.length} stock rows.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
