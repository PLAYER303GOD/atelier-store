// Catalogue types and client-safe helpers, plus homepage editorial content.
// Products live in the database: query them via src/lib/products.ts (server only).
// Images: Unsplash (https://unsplash.com/license).

export type Image = { src: string; alt: string };

export type Product = {
  slug: string;
  name: string;
  category: { slug: string; name: string };
  /** Minor units (cents). */
  priceCents: number;
  colour: string;
  description: string;
  details: string[];
  /** Units available; drives the stock status shown on the product page. */
  stock: number;
  /** First image is the primary shot used on cards. */
  images: [Image, ...Image[]];
  badge?: string;
};

export type Collection = {
  slug: string;
  name: string;
  description: string;
  image: Image;
};

/** Unsplash photo URL, capped at 2400px so the optimiser never fetches full-size originals. */
function unsplash(id: string) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=max&w=2400&q=80`;
}

export const hero = {
  eyebrow: "Autumn–Winter 2026",
  title: "The Quiet Season",
  body: "Considered layers, softened tailoring and pieces made to be worn for years.",
  image: {
    src: unsplash("1445205170230-053b83016050"),
    alt: "Rails of neutral-toned garments in a softly lit boutique",
  },
} as const;

export const editorial = {
  eyebrow: "The journal",
  title: "Made to travel, made to stay",
  body: "A coat cut from double-faced wool, a scarf in brushed cashmere. Our outerwear is designed in small runs and finished by hand, so it moves with you from the first cold morning to the last.",
  image: {
    src: unsplash("1539109136881-3be0616acf4b"),
    alt: "Woman in a pale blue wool coat and scarf on a cathedral square",
  },
} as const;

export const featuredCollections: Collection[] = [
  {
    slug: "women",
    name: "Women",
    description: "Fluid silhouettes and soft tailoring.",
    image: {
      src: unsplash("1581044777550-4cfa60707c03"),
      alt: "Woman in a pale pink ruffled dress standing in a golden field",
    },
  },
  {
    slug: "men",
    name: "Men",
    description: "Sharp tailoring for every hour.",
    image: {
      src: unsplash("1617137968427-85924c800a22"),
      alt: "Man in a navy two-piece suit and white shirt outside a glass building",
    },
  },
  {
    slug: "bags-accessories",
    name: "Bags & Accessories",
    description: "Structured leather, made to last.",
    image: {
      src: unsplash("1594223274512-ad4803739b7c"),
      alt: "Teal grained-leather top-handle bag with a gold clasp beside tortoiseshell glasses",
    },
  },
];

export function categoryHref(categorySlug: string) {
  return `/${categorySlug}`;
}

export type StockStatus = { state: "in-stock" | "low-stock" | "out-of-stock"; label: string };

/** Up to this many units counts as low stock. */
const LOW_STOCK_THRESHOLD = 3;

export function getStockStatus(stock: number): StockStatus {
  if (stock <= 0) return { state: "out-of-stock", label: "Out of stock" };
  if (stock <= LOW_STOCK_THRESHOLD) return { state: "low-stock", label: `Only ${stock} left` };
  return { state: "in-stock", label: "In stock" };
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatPrice(cents: number) {
  return usd.format(cents / 100);
}

/** Longest search query the site accepts (input maxLength, page and API all cap to it). */
export const MAX_SEARCH_LENGTH = 100;

/** Trimmed, single-spaced and capped: the one shape a search query takes everywhere. */
export function normalizeSearchQuery(raw: string | string[] | null | undefined) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (value ?? "").trim().replace(/\s+/g, " ").slice(0, MAX_SEARCH_LENGTH);
}
