import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

// Catalogue tables: categories 1──< products 1──1 stocks, and products >──< collections.
// Variants are deliberately out of scope for now. Carts and orders live in their own files.

export type ProductImage = { src: string; alt: string };

/**
 * Whether customers can see and buy a product. "hidden": gone from listings, search, saved items
 * and its page (404); can't be added to a bag or checked out. Orders that contain it are unaffected.
 */
export const PRODUCT_STATUSES = ["active", "hidden"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const categories = pgTable("categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable(
  "products",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    /** Minor units (cents) to avoid floating-point money. */
    priceCents: integer("price_cents").notNull(),
    colour: text("colour").notNull(),
    description: text("description").notNull(),
    /** Ordered bullet list shown under "Product details". */
    details: text("details").array().notNull().default(sql`'{}'::text[]`),
    /** Ordered; the first image is the card shot. Always at least one. */
    images: jsonb("images").$type<[ProductImage, ...ProductImage[]]>().notNull(),
    badge: text("badge"),
    status: text("status").$type<ProductStatus>().notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("products_category_id_idx").on(t.categoryId),
    check("products_price_cents_non_negative", sql`${t.priceCents} >= 0`),
    check("products_status_valid", sql`${t.status} in ('active', 'hidden')`),
  ],
);

/**
 * Curated, overlapping groupings (Women, Men, Gifts…). Unlike a category, a product can sit
 * in any number of collections, so membership lives in product_collections.
 */
export const collections = pgTable("collections", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /** One or two sentences shown under the collection page heading. */
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Membership rows are owned by both sides, so deleting either removes them. */
export const productCollections = pgTable(
  "product_collections",
  {
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    collectionId: integer("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.collectionId, t.productId] }),
    // The PK leads with collection_id (listing a collection); this serves product → collections.
    index("product_collections_product_id_idx").on(t.productId),
  ],
);

/** One row per product for now; can be keyed by variant or location later. */
export const stocks = pgTable(
  "stocks",
  {
    productId: integer("product_id")
      .primaryKey()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [check("stocks_quantity_non_negative", sql`${t.quantity} >= 0`)],
);
