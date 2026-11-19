// Sample catalogue loaded by `pnpm db:seed`. Images: Unsplash (https://unsplash.com/license).
// Products are listed newest first; the seed staggers created_at to keep this order.

import type { ProductImage } from "./catalog-schema";

/** Unsplash photo URL, capped at 2400px so the optimiser never fetches full-size originals. */
function unsplash(id: string) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=max&w=2400&q=80`;
}

export const seedCategories = [
  { slug: "knitwear", name: "Knitwear" },
  { slug: "outerwear", name: "Outerwear" },
  { slug: "ready-to-wear", name: "Ready-to-wear" },
  { slug: "eyewear", name: "Eyewear" },
  { slug: "jewelry", name: "Jewelry" },
  { slug: "shoes", name: "Shoes" },
  { slug: "bags", name: "Bags" },
] as const;

type CategorySlug = (typeof seedCategories)[number]["slug"];

export type SeedProduct = {
  slug: string;
  name: string;
  category: CategorySlug;
  priceCents: number;
  colour: string;
  description: string;
  details: string[];
  stock: number;
  images: [ProductImage, ...ProductImage[]];
  badge?: string;
};

export const seedProducts: SeedProduct[] = [
  {
    slug: "fringed-knit-poncho",
    name: "Fringed knit poncho",
    category: "knitwear",
    priceCents: 125000,
    colour: "Ivory",
    badge: "New",
    stock: 12,
    description:
      "An open-knit poncho with a softly draped V-neck and a hand-knotted fringe at the hem. Light enough to layer over a slip dress, warm enough for cool evenings.",
    details: [
      "Open-stitch knit",
      "V-neckline",
      "Hand-knotted fringe hem",
      "Relaxed, one-size fit",
      "100% cotton",
      "Hand wash cold, dry flat",
      "Made in Italy",
    ],
    images: [
      { src: unsplash("1434389677669-e08b4cac3105"), alt: "Cream open-knit poncho with fringed hem on a hanger" },
    ],
  },
  {
    slug: "leather-biker-jacket",
    name: "Leather biker jacket",
    category: "outerwear",
    priceCents: 420000,
    colour: "Black",
    stock: 2,
    description:
      "A classic biker silhouette in supple lambskin with an asymmetric zip, notched lapels and polished silver-tone hardware. Cut close to the body and designed to soften with wear.",
    details: [
      "Lambskin leather",
      "Asymmetric front zip",
      "Notched lapels with snap fastening",
      "Zipped cuffs and pockets",
      "Cupro lining",
      "Specialist leather clean only",
      "Made in Italy",
    ],
    images: [
      { src: unsplash("1521223890158-f9f7c3d5d504"), alt: "Close-up of a black leather biker jacket with silver zips, worn open" },
      { src: unsplash("1520975954732-35dd22299614"), alt: "Man wearing a black leather biker jacket against a brick wall" },
    ],
  },
  {
    slug: "hooded-field-jacket",
    name: "Hooded field jacket",
    category: "outerwear",
    priceCents: 195000,
    colour: "Olive",
    badge: "New",
    stock: 7,
    description:
      "A water-repellent field jacket in technical cotton with a stowaway hood, storm placket and generous bellows pockets. Built for changeable weather, finished for the city.",
    details: [
      "Water-repellent technical cotton",
      "Stowaway hood",
      "Two-way zip under a snap storm placket",
      "Four bellows pockets",
      "Regular fit",
      "Machine wash cold",
      "Made in Portugal",
    ],
    images: [
      { src: unsplash("1548883354-94bcfe321cbb"), alt: "Man wearing an olive hooded field jacket in a forest" },
    ],
  },
  {
    slug: "satin-jogger-trousers",
    name: "Satin jogger trousers",
    category: "ready-to-wear",
    priceCents: 98000,
    colour: "Blush",
    stock: 0,
    description:
      "Relaxed trousers in washed satin with an elasticated waist, front pleats and gathered cuffs. Effortless with knitwear or a crisp shirt.",
    details: [
      "Washed satin",
      "Elasticated waist with drawcord",
      "Front pleats",
      "Gathered ankle cuffs",
      "Relaxed fit",
      "Dry clean only",
      "Made in Portugal",
    ],
    images: [{ src: unsplash("1594633312681-425c7b97ccd1"), alt: "Blush satin trousers with cuffed ankles" }],
  },
  {
    slug: "round-metal-sunglasses",
    name: "Round metal sunglasses",
    category: "eyewear",
    priceCents: 52000,
    colour: "Gold / green",
    stock: 15,
    description:
      "Fine round frames in brushed gold-tone metal with green mineral lenses. Adjustable nose pads and slim temples make them comfortable all day.",
    details: [
      "Gold-tone metal frame",
      "Green mineral glass lenses",
      "100% UVA/UVB protection",
      "Adjustable nose pads",
      "Includes leather case and cloth",
      "Made in Japan",
    ],
    images: [
      { src: unsplash("1511499767150-a48a237f0083"), alt: "Round gold-frame sunglasses with green lenses" },
    ],
  },
  {
    slug: "pearl-strand-necklace",
    name: "Pearl strand necklace",
    category: "jewelry",
    priceCents: 189000,
    colour: "White",
    badge: "New",
    stock: 1,
    description:
      "A single strand of hand-knotted freshwater pearls with a sculpted silver clasp. Wear it alone, or layered with fine chains.",
    details: [
      "Freshwater pearls, 7–8 mm",
      "Hand-knotted on silk",
      "Sterling silver clasp",
      "Length: 45 cm",
      "Store flat in the pouch provided",
      "Made in Italy",
    ],
    images: [
      { src: unsplash("1515562141207-7a88fb7ce338"), alt: "Single-strand pearl necklace in an open jewelry box" },
    ],
  },
  {
    slug: "floral-stiletto-pumps",
    name: "Floral stiletto pumps",
    category: "shoes",
    priceCents: 115000,
    colour: "Blue floral",
    stock: 4,
    description:
      "Pointed-toe pumps in printed satin on a slender 105 mm heel. The bold floral print is placed by hand, so no two pairs are exactly alike.",
    details: [
      "Printed satin upper",
      "Pointed toe",
      "105 mm stiletto heel",
      "Leather lining and sole",
      "Fits true to size",
      "Made in Italy",
    ],
    images: [{ src: unsplash("1543163521-1bf539c55dd2"), alt: "Pair of blue floral-print stiletto pumps" }],
  },
  {
    slug: "woven-leather-shoulder-bag",
    name: "Woven leather shoulder bag",
    category: "bags",
    priceCents: 290000,
    colour: "Cognac",
    stock: 9,
    description:
      "A soft, slouchy shoulder bag hand-woven from wide strips of calfskin, finished with a polished chain strap. Roomy enough for the day, light enough to carry all of it.",
    details: [
      "Hand-woven calfskin leather",
      "Gold-tone chain shoulder strap",
      "Magnetic top closure",
      "Suede-lined interior with slip pocket",
      "Dimensions: 38 × 26 × 12 cm",
      "Made in Italy",
    ],
    images: [
      { src: unsplash("1598532163257-ae3c6b2524b6"), alt: "Cognac woven leather shoulder bag with a gold chain strap" },
    ],
  },
];
