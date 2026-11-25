// Product form validation for the admin. Plain and client-safe: the server actions
// (src/lib/admin-product-actions.ts) run it as the authority, and the form runs the same rules
// for errors after blur, so both say the same thing. Never trust the client's result.

import type { ProductImage, ProductStatus } from "@/db/catalog-schema";

export const PRODUCT_LIMITS = {
  name: 120,
  slug: 100,
  colour: 60,
  description: 2000,
  detailLines: 12,
  detailLength: 200,
  badge: 30,
  alt: 200,
  images: 6,
  maxPriceCents: 100_000_000, // $1,000,000.00
  maxInitialStock: 10_000,
} as const;

/** Lower-case words joined by single hyphens (what product URLs use). */
export const PRODUCT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The only images the site can display (next.config.ts allows images.unsplash.com/photo-*). */
export const IMAGE_URL_PATTERN = /^https:\/\/images\.unsplash\.com\/photo-[A-Za-z0-9-]+(?:\?[^\s"'<>]*)?$/;

/** What the form holds: strings as typed, before parsing. */
export type ProductFormValues = {
  name: string;
  slug: string;
  categorySlug: string;
  price: string;
  colour: string;
  description: string;
  /** One detail per line. */
  details: string;
  badge: string;
  status: ProductStatus;
  images: ProductImage[];
  /** Create only. */
  initialStock: string;
};

/** Parsed, valid input, ready to write. */
export type ProductInput = {
  name: string;
  slug: string;
  categorySlug: string;
  priceCents: number;
  colour: string;
  description: string;
  details: string[];
  badge: string | null;
  status: ProductStatus;
  images: [ProductImage, ...ProductImage[]];
  initialStock: number;
};

/** Field name → message. Image rows use `images.<i>.src` / `images.<i>.alt`; the list itself `images`. */
export type ProductFieldErrors = Record<string, string>;

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  name: "",
  slug: "",
  categorySlug: "",
  price: "",
  colour: "",
  description: "",
  details: "",
  badge: "",
  status: "active",
  images: [{ src: "", alt: "" }],
  initialStock: "0",
};

/** "Double-faced Wool Coat" → "double-faced-wool-coat". */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, PRODUCT_LIMITS.slug)
    .replace(/-+$/, "");
}

/**
 * "1290" / "1290.5" / "1,290.50" / "$1290" → cents, by splitting the string: never through a float.
 * Null when it isn't a non-negative amount with at most two decimals.
 */
export function parsePriceToCents(text: string): number | null {
  const clean = text.trim().replace(/^\$/, "").replace(/,(?=\d{3}(\D|$))/g, "");
  const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(clean);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return cents <= PRODUCT_LIMITS.maxPriceCents ? cents : null;
}

const detailLines = (details: string) =>
  details
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

export function validateProduct(
  values: ProductFormValues,
  mode: "create" | "edit",
): { data: ProductInput; errors?: undefined } | { data?: undefined; errors: ProductFieldErrors } {
  const errors: ProductFieldErrors = {};
  const name = values.name.trim();
  const slug = values.slug.trim();
  const colour = values.colour.trim();
  const description = values.description.trim();
  const badge = values.badge.trim();
  const details = detailLines(values.details);
  const L = PRODUCT_LIMITS;

  if (!name) errors.name = "Enter the product name.";
  else if (name.length > L.name) errors.name = `Use ${L.name} characters or fewer.`;

  if (!slug) errors.slug = "Enter the web address.";
  else if (slug.length > L.slug || !PRODUCT_SLUG_PATTERN.test(slug)) {
    errors.slug = "Use lower-case letters, numbers and single hyphens, e.g. wool-coat.";
  }

  if (!values.categorySlug) errors.categorySlug = "Choose a category.";

  const priceCents = parsePriceToCents(values.price);
  if (!values.price.trim()) errors.price = "Enter the price.";
  else if (priceCents === null) errors.price = "Enter an amount like 1290 or 1290.50 (up to $1,000,000).";

  if (!colour) errors.colour = "Enter the colour.";
  else if (colour.length > L.colour) errors.colour = `Use ${L.colour} characters or fewer.`;

  if (!description) errors.description = "Enter a description.";
  else if (description.length > L.description) errors.description = `Use ${L.description} characters or fewer.`;

  if (details.length > L.detailLines) errors.details = `Use at most ${L.detailLines} lines.`;
  else if (details.some((line) => line.length > L.detailLength)) errors.details = `Keep each line to ${L.detailLength} characters.`;

  if (badge.length > L.badge) errors.badge = `Use ${L.badge} characters or fewer.`;

  if (values.status !== "active" && values.status !== "hidden") errors.status = "Choose whether the product is available.";

  const images = values.images.map((image) => ({ src: image.src.trim(), alt: image.alt.trim() }));
  if (images.length === 0) errors.images = "Add at least one image.";
  else if (images.length > L.images) errors.images = `Use at most ${L.images} images.`;
  images.forEach((image, i) => {
    if (!image.src) errors[`images.${i}.src`] = "Paste the image address.";
    else if (!IMAGE_URL_PATTERN.test(image.src)) {
      errors[`images.${i}.src`] = "Use an Unsplash photo address (https://images.unsplash.com/photo-…).";
    }
    if (!image.alt) errors[`images.${i}.alt`] = "Describe the image for people who can't see it.";
    else if (image.alt.length > L.alt) errors[`images.${i}.alt`] = `Use ${L.alt} characters or fewer.`;
  });

  let initialStock = 0;
  if (mode === "create") {
    const raw = values.initialStock.trim() || "0";
    initialStock = /^\d+$/.test(raw) ? Number(raw) : NaN;
    if (!Number.isInteger(initialStock) || initialStock > L.maxInitialStock) {
      errors.initialStock = `Enter a whole number from 0 to ${L.maxInitialStock}.`;
    }
  }

  if (Object.keys(errors).length > 0) return { errors };
  return {
    data: {
      name,
      slug,
      categorySlug: values.categorySlug,
      priceCents: priceCents!,
      colour,
      description,
      details,
      badge: badge || null,
      status: values.status,
      images: images as [ProductImage, ...ProductImage[]],
      initialStock,
    },
  };
}

/** The form's fields, read back from a submitted FormData (the server never sees anything else). */
export function productFormValuesFromFormData(form: FormData): ProductFormValues {
  const text = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value : "";
  };
  const srcs = form.getAll("imageSrc").map((v) => (typeof v === "string" ? v : ""));
  const alts = form.getAll("imageAlt").map((v) => (typeof v === "string" ? v : ""));
  return {
    name: text("name"),
    slug: text("slug"),
    categorySlug: text("categorySlug"),
    price: text("price"),
    colour: text("colour"),
    description: text("description"),
    details: text("details"),
    badge: text("badge"),
    // Anything else fails validateProduct's status rule.
    status: text("status") as ProductStatus,
    images: srcs.slice(0, PRODUCT_LIMITS.images + 1).map((src, i) => ({ src, alt: alts[i] ?? "" })),
    initialStock: text("initialStock"),
  };
}

/** Cents → "1290.50" for the price field (no currency symbol, no grouping). */
export const centsToPriceInput = (cents: number) => `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
