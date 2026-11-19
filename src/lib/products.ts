// Server-side catalogue queries. Returns the same `Product` shape the UI has always used.
// Each read is cached ("use cache") so pages stay in the static shell; the `products` tag lets
// future writes invalidate them with updateTag("products"). Stock may be up to ~1 minute stale.

import { asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db";
import { categories, products, stocks } from "@/db/schema";
import type { Product } from "@/lib/catalog";

function selectProducts() {
  return db
    .select({
      slug: products.slug,
      name: products.name,
      categorySlug: categories.slug,
      categoryName: categories.name,
      priceCents: products.priceCents,
      colour: products.colour,
      description: products.description,
      details: products.details,
      images: products.images,
      badge: products.badge,
      // No stock row means nothing to sell.
      stock: sql<number>`coalesce(${stocks.quantity}, 0)`.mapWith(Number),
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(stocks, eq(stocks.productId, products.id))
    .$dynamic();
}

type ProductRow = Awaited<ReturnType<typeof selectProducts>>[number];

function toProduct({ categorySlug, categoryName, badge, ...row }: ProductRow): Product {
  return {
    ...row,
    category: { slug: categorySlug, name: categoryName },
    ...(badge ? { badge } : {}),
  };
}

function cacheProducts() {
  cacheTag("products");
  cacheLife("minutes");
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  "use cache";
  cacheProducts();
  const [row] = await selectProducts().where(eq(products.slug, slug)).limit(1);
  return row && toProduct(row);
}

/** Homepage "New arrivals" row, newest first. */
export async function getNewArrivals(limit = 8): Promise<Product[]> {
  "use cache";
  cacheProducts();
  const rows = await selectProducts().orderBy(desc(products.createdAt), asc(products.id)).limit(limit);
  return rows.map(toProduct);
}

/** Same-category products first, then the rest of the catalogue. */
export async function getRelatedProducts(product: Pick<Product, "slug" | "category">, count = 4) {
  "use cache";
  cacheProducts();
  const rows = await selectProducts()
    .where(ne(products.slug, product.slug))
    .orderBy(
      desc(sql`${categories.slug} = ${product.category.slug}`),
      desc(products.createdAt),
      asc(products.id),
    )
    .limit(count);
  return rows.map(toProduct);
}

/** Products for the given slugs, in the order given; unknown slugs are dropped. */
export async function getProductsBySlugs(slugs: string[]): Promise<Product[]> {
  "use cache";
  cacheProducts();
  if (slugs.length === 0) return [];
  const rows = await selectProducts().where(inArray(products.slug, slugs));
  const bySlug = new Map(rows.map((row) => [row.slug, toProduct(row)]));
  return slugs.flatMap((slug) => bySlug.get(slug) ?? []);
}

export async function getProductSlugs(): Promise<string[]> {
  "use cache";
  cacheProducts();
  const rows = await db.select({ slug: products.slug }).from(products);
  return rows.map((row) => row.slug);
}
