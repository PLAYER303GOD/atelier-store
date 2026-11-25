// Server-side catalogue queries. Returns the same `Product` shape the UI has always used.
// Each read is cached ("use cache") so pages stay in the static shell; the `products` tag lets
// future writes invalidate them with updateTag("products"). Stock may be up to ~1 minute stale.

import { and, asc, desc, eq, inArray, ne, type SQL, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db";
import { categories, collections, productCollections, products, stocks } from "@/db/schema";
import { MAX_SEARCH_LENGTH, type Product } from "@/lib/catalog";

/** Customers only ever see active products; hidden ones are left out of every read below. */
const visible = eq(products.status, "active");

/** The shared product select, always limited to visible products (plus `where`, if given). */
function selectProducts(where?: SQL) {
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
    .where(where ? and(visible, where) : visible)
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
  const [row] = await selectProducts(eq(products.slug, slug)).limit(1);
  return row && toProduct(row);
}

/** Newest products first: the homepage row and the /new-in page. */
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
  const rows = await selectProducts(ne(products.slug, product.slug))
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
  const rows = await selectProducts(inArray(products.slug, slugs));
  const bySlug = new Map(rows.map((row) => [row.slug, toProduct(row)]));
  return slugs.flatMap((slug) => bySlug.get(slug) ?? []);
}

export async function getCategory(slug: string): Promise<Product["category"] | undefined> {
  "use cache";
  cacheProducts();
  const [row] = await db
    .select({ slug: categories.slug, name: categories.name })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  return row;
}

/** One category's products, newest first. */
export async function getCategoryProducts(categorySlug: string): Promise<Product[]> {
  "use cache";
  cacheProducts();
  const rows = await selectProducts(eq(categories.slug, categorySlug))
    .orderBy(desc(products.createdAt), asc(products.id));
  return rows.map(toProduct);
}

/** Lower-case words, at most five; a trailing plural "s" is dropped so "jackets" finds "jacket". */
function searchTerms(query: string) {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .map((term) => (term.length > 3 && term.endsWith("s") && !term.endsWith("ss") ? term.slice(0, -1) : term));
}

/** `%term%` with LIKE wildcards in the term itself matched literally. */
const likePattern = (term: string) => `%${term.replace(/[\\%_]/g, "\\$&")}%`;

/**
 * Products matching every word of the query in their name, colour, category, description or
 * details. Name, colour and category matches rank first, then newest. Fine for a small catalogue;
 * move to Postgres full-text search (tsvector + GIN index) once it grows.
 */
export async function searchProducts(query: string): Promise<Product[]> {
  "use cache";
  cacheProducts();
  const terms = searchTerms(query.slice(0, MAX_SEARCH_LENGTH));
  if (terms.length === 0) return [];

  const haystack = sql`concat_ws(' ', ${products.name}, ${products.colour}, ${categories.name}, ${products.description}, array_to_string(${products.details}, ' '))`;
  const strong = sql`concat_ws(' ', ${products.name}, ${products.colour}, ${categories.name})`;
  const rows = await selectProducts(and(...terms.map((term) => sql`${haystack} ilike ${likePattern(term)}`)))
    .orderBy(
      desc(sql.join(terms.map((term) => sql`(${strong} ilike ${likePattern(term)})::int`), sql` + `)),
      desc(products.createdAt),
      asc(products.id),
    )
    .limit(48);
  return rows.map(toProduct);
}

export type CategorySummary = Product["category"] & { cover: Product["images"][number]; count: number };

/** Categories that have products, A–Z, each with its newest product's first image as a cover. */
export async function getCategorySummaries(): Promise<CategorySummary[]> {
  "use cache";
  cacheProducts();
  const rows = await db
    .selectDistinctOn([categories.id], {
      slug: categories.slug,
      name: categories.name,
      images: products.images,
      // Window functions run before DISTINCT ON, so this counts the whole category.
      count: sql<number>`count(*) over (partition by ${categories.id})`.mapWith(Number),
    })
    .from(categories)
    .innerJoin(products, eq(products.categoryId, categories.id))
    .where(visible)
    .orderBy(categories.id, desc(products.createdAt), asc(products.id));
  return rows
    .map(({ images, ...row }) => ({ ...row, cover: images[0] }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCategorySlugs(): Promise<string[]> {
  "use cache";
  cacheProducts();
  const rows = await db.select({ slug: categories.slug }).from(categories);
  return rows.map((row) => row.slug);
}

export type Collection = { slug: string; name: string; description: string };

export async function getCollection(slug: string): Promise<Collection | undefined> {
  "use cache";
  cacheProducts();
  const [row] = await db
    .select({ slug: collections.slug, name: collections.name, description: collections.description })
    .from(collections)
    .where(eq(collections.slug, slug))
    .limit(1);
  return row;
}

/** A collection's products, newest first. */
export async function getCollectionProducts(collectionSlug: string): Promise<Product[]> {
  "use cache";
  cacheProducts();
  // The filter goes into selectProducts (never a second .where(), which would replace visibility).
  const rows = await selectProducts(eq(collections.slug, collectionSlug))
    .innerJoin(productCollections, eq(productCollections.productId, products.id))
    .innerJoin(collections, eq(collections.id, productCollections.collectionId))
    .orderBy(desc(products.createdAt), asc(products.id));
  return rows.map(toProduct);
}

export async function getCollectionSlugs(): Promise<string[]> {
  "use cache";
  cacheProducts();
  const rows = await db.select({ slug: collections.slug }).from(collections);
  return rows.map((row) => row.slug);
}

export type StockOverview = {
  products: number;
  categories: number;
  collections: number;
  outOfStock: number;
  /** Out-of-stock and low-stock (≤ 3) products, lowest stock first. */
  alerts: Pick<Product, "slug" | "name" | "category" | "stock">[];
};

/** Catalogue health for /admin. Not user-specific, so it caches like any catalogue read. */
export async function getStockOverview(): Promise<StockOverview> {
  "use cache";
  cacheProducts();
  const [rows, [{ categoryCount }], [{ collectionCount }]] = await Promise.all([
    selectProducts().orderBy(asc(sql`coalesce(${stocks.quantity}, 0)`), asc(products.name)),
    db.select({ categoryCount: sql<number>`count(*)`.mapWith(Number) }).from(categories),
    db.select({ collectionCount: sql<number>`count(*)`.mapWith(Number) }).from(collections),
  ]);
  return {
    products: rows.length,
    categories: categoryCount,
    collections: collectionCount,
    outOfStock: rows.filter((row) => row.stock <= 0).length,
    alerts: rows
      .filter((row) => row.stock <= 3)
      .map(({ slug, name, categorySlug, categoryName, stock }) => ({
        slug,
        name,
        stock,
        category: { slug: categorySlug, name: categoryName },
      })),
  };
}

export async function getProductSlugs(): Promise<string[]> {
  "use cache";
  cacheProducts();
  const rows = await db.select({ slug: products.slug }).from(products).where(visible);
  return rows.map((row) => row.slug);
}
