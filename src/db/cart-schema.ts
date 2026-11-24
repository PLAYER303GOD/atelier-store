import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

import { users } from "./auth-schema";
import { products } from "./catalog-schema";

// Shopping bag: carts 1──< cart_items >──1 products. A cart stores product + quantity only,
// never a price, so the bag always shows current pricing. Owner rules live in src/lib/cart.ts.

/** Most units of one product a bag line can hold (also enforced by the check below). */
export const MAX_PER_LINE = 10;

/**
 * A guest bag is owned by `token` (the httpOnly `atelier_cart` cookie value); an account bag
 * by `user_id` (one per user). Guest bags are merged into the account bag at sign-in.
 */
export const carts = pgTable(
  "carts",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    token: text("token").unique(),
    userId: text("user_id")
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [check("carts_has_owner", sql`${t.token} is not null or ${t.userId} is not null`)],
);

/** One row per product in a bag. Quantity 0 is never stored: the line is deleted instead. */
export const cartItems = pgTable(
  "cart_items",
  {
    cartId: integer("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    primaryKey({ columns: [t.cartId, t.productId] }),
    index("cart_items_product_id_idx").on(t.productId),
    check("cart_items_quantity_range", sql`${t.quantity} between 1 and ${sql.raw(String(MAX_PER_LINE))}`),
  ],
);
