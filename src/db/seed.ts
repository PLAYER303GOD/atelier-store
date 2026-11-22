// Loads the sample catalogue. Safe to re-run: every insert upserts on its natural key.
// Run with `pnpm db:seed` (reads DATABASE_URL from .env.local).

import { inArray, sql } from "drizzle-orm";

import { db } from "./index";
import { categories, collections, productCollections, products, stocks } from "./schema";
import { seedCategories, seedCollections, seedProducts } from "./seed-data";

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

  // Collections: upsert, then replace their membership so it always matches seed-data.
  // (The Neon HTTP driver has no transactions; a failure here leaves memberships to re-seed.)
  const collectionRows = await db
    .insert(collections)
    .values(seedCollections.map(({ slug, name, description }) => ({ slug, name, description })))
    .onConflictDoUpdate({
      target: collections.slug,
      set: { name: excluded("name"), description: excluded("description") },
    })
    .returning({ id: collections.id, slug: collections.slug });
  const collectionId = new Map(collectionRows.map((row) => [row.slug, row.id]));

  const memberships = seedCollections.flatMap((collection) =>
    collection.products.map((slug) => {
      const id = productId.get(slug);
      if (id === undefined) throw new Error(`Collection "${collection.slug}" lists unknown product "${slug}"`);
      return { collectionId: collectionId.get(collection.slug)!, productId: id };
    }),
  );
  await db.delete(productCollections).where(inArray(productCollections.collectionId, [...collectionId.values()]));
  await db.insert(productCollections).values(memberships);

  console.log(
    `Seeded ${categoryRows.length} categories, ${productRows.length} products, ${seedProducts.length} stock rows, ` +
      `${collectionRows.length} collections, ${memberships.length} collection memberships.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
