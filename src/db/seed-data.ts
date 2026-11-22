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

/**
 * Curated collections and their members (product slugs; the seed fails on an unknown slug).
 * Slugs match the nav (/collections/women…) and the homepage's featured collection tiles.
 */
export const seedCollections: { slug: string; name: string; description: string; products: string[] }[] = [
  {
    slug: "women",
    name: "Women",
    description: "Fluid silhouettes and soft tailoring, from knitwear and dresses to the pieces that finish them.",
    products: [
      "fringed-knit-poncho", "satin-jogger-trousers", "round-metal-sunglasses", "pearl-strand-necklace",
      "floral-stiletto-pumps", "woven-leather-shoulder-bag", "chunky-rib-sweater", "cable-knit-jumper",
      "belted-wrap-coat", "check-wool-blazer", "tie-neck-blouse", "cat-eye-sunglasses",
      "crescent-pendant-necklace", "sapphire-drop-earrings", "belted-leather-tote", "tangerine-crew-sweater",
      "striped-fringed-scarf", "floral-belted-dress", "fleece-jogging-set", "sherpa-collar-denim-jacket",
      "crystal-round-sunglasses", "diamond-halo-ring", "crystal-paisley-bangle", "suede-court-shoes",
    ],
  },
  {
    slug: "men",
    name: "Men",
    description: "Sharp tailoring for every hour, with outerwear, leather shoes and the accessories to match.",
    products: [
      "leather-biker-jacket", "hooded-field-jacket", "round-metal-sunglasses", "cable-knit-jumper",
      "half-rim-optical-frames", "leather-monk-strap-shoes", "leather-lace-up-boots", "canvas-day-backpack",
      "striped-fringed-scarf", "satin-bomber-jacket", "hooded-duffle-coat", "sherpa-collar-denim-jacket",
      "navy-wool-suit", "windowpane-check-suit", "crystal-round-sunglasses", "leather-chukka-boots",
    ],
  },
  {
    slug: "gifts",
    name: "Gifts",
    description: "Pieces chosen to be given: jewelry, eyewear, soft knits and leather, each wrapped by hand.",
    products: [
      "pearl-strand-necklace", "round-metal-sunglasses", "woven-leather-shoulder-bag", "chunky-rib-sweater",
      "cat-eye-sunglasses", "crescent-pendant-necklace", "sapphire-drop-earrings", "canvas-day-backpack",
      "striped-fringed-scarf", "crystal-round-sunglasses", "diamond-halo-ring", "crystal-paisley-bangle",
    ],
  },
  {
    // The homepage hero campaign ("The Quiet Season") links here.
    slug: "autumn-winter",
    name: "Autumn–Winter 2026",
    description: "The Quiet Season: considered layers, softened tailoring and pieces made to be worn for years.",
    products: [
      "fringed-knit-poncho", "leather-biker-jacket", "hooded-field-jacket", "chunky-rib-sweater",
      "cable-knit-jumper", "belted-wrap-coat", "check-wool-blazer", "leather-lace-up-boots",
      "tangerine-crew-sweater", "striped-fringed-scarf", "satin-bomber-jacket", "hooded-duffle-coat",
      "sherpa-collar-denim-jacket", "navy-wool-suit", "windowpane-check-suit", "leather-chukka-boots",
    ],
  },
  {
    slug: "bags-accessories",
    name: "Bags & Accessories",
    description: "Structured leather, made to last, alongside the eyewear and jewelry that complete a look.",
    products: [
      "round-metal-sunglasses", "pearl-strand-necklace", "woven-leather-shoulder-bag", "cat-eye-sunglasses",
      "half-rim-optical-frames", "crescent-pendant-necklace", "sapphire-drop-earrings", "belted-leather-tote",
      "canvas-day-backpack", "striped-fringed-scarf", "crystal-round-sunglasses", "diamond-halo-ring",
      "crystal-paisley-bangle",
    ],
  },
];

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
  // Earlier arrivals, listed after the eight "New arrivals" so the homepage row is unchanged.
  {
    slug: "chunky-rib-sweater",
    name: "Chunky rib sweater",
    category: "knitwear",
    priceCents: 89000,
    colour: "Oatmeal",
    stock: 14,
    description:
      "A cropped crew-neck sweater in a deep fisherman rib, knitted from a soft wool blend. The sleeves are cut long to be pushed up or worn over the hand.",
    details: [
      "Chunky fisherman-rib knit",
      "Crew neckline",
      "Dropped shoulders, long sleeves",
      "Slightly cropped, boxy fit",
      "70% wool, 30% alpaca",
      "Hand wash cold, dry flat",
      "Made in Scotland",
    ],
    images: [{ src: unsplash("1631541909061-71e349d1f203"), alt: "Oatmeal chunky rib-knit sweater on a wooden hanger" }],
  },
  {
    slug: "cable-knit-jumper",
    name: "Cable-knit jumper",
    category: "knitwear",
    priceCents: 112000,
    colour: "Forest green",
    stock: 3,
    description:
      "An oversized jumper with a single cable running down the front, knitted in a brushed wool that softens with every wear. Long enough to wear over leggings.",
    details: [
      "Centre-front cable knit",
      "Ribbed crew neck, cuffs and hem",
      "Oversized, longline fit",
      "100% brushed merino wool",
      "Hand wash cold, dry flat",
      "Made in Ireland",
    ],
    images: [{ src: unsplash("1580331451062-99ff652288d7"), alt: "Woman in an oversized forest-green cable-knit jumper" }],
  },
  {
    slug: "belted-wrap-coat",
    name: "Belted wrap coat",
    category: "outerwear",
    priceCents: 245000,
    colour: "Camel",
    stock: 6,
    description:
      "A wrap coat in double-faced wool with wide notched lapels and a self-tie belt. Unlined and unstructured, so it falls softly from the shoulder.",
    details: [
      "Double-faced wool",
      "Notched lapels",
      "Self-tie waist belt",
      "Side seam pockets",
      "Unlined",
      "Dry clean only",
      "Made in Italy",
    ],
    images: [{ src: unsplash("1539533018447-63fcce2678e3"), alt: "Woman in a camel belted wrap coat sitting on stone steps" }],
  },
  {
    slug: "check-wool-blazer",
    name: "Check wool blazer",
    category: "ready-to-wear",
    priceCents: 165000,
    colour: "Grey check",
    stock: 5,
    description:
      "A double-breasted blazer in a fine glen-check wool, cut slightly oversized with a softly padded shoulder. Wear it buttoned with trousers or open over denim.",
    details: [
      "Glen-check wool",
      "Double-breasted, horn-effect buttons",
      "Peak lapels",
      "Flap pockets",
      "Viscose lining",
      "Dry clean only",
      "Made in Portugal",
    ],
    images: [
      { src: unsplash("1608234808654-2a8875faa7fd"), alt: "Woman in a grey check double-breasted blazer over a white shirt" },
    ],
  },
  {
    slug: "tie-neck-blouse",
    name: "Tie-neck blouse",
    category: "ready-to-wear",
    priceCents: 69000,
    colour: "White",
    stock: 0,
    description:
      "A fluid blouse in silk crêpe de chine with a fine contrast tie at the collar and single-button cuffs. Tucks neatly into a high-waisted skirt.",
    details: [
      "Silk crêpe de chine",
      "Point collar with contrast tie",
      "Concealed button placket",
      "Single-button cuffs",
      "100% silk",
      "Dry clean only",
      "Made in Italy",
    ],
    images: [
      { src: unsplash("1608234807905-4466023792f5"), alt: "Woman in a white tie-neck blouse and a black buttoned skirt" },
    ],
  },
  {
    slug: "cat-eye-sunglasses",
    name: "Cat-eye sunglasses",
    category: "eyewear",
    priceCents: 46000,
    colour: "Blush",
    stock: 11,
    description:
      "Oversized cat-eye sunglasses with a blush acetate front, fine gold-tone metal bridge and gradient lenses. Full UV protection in a shape that flatters most faces.",
    details: [
      "Hand-polished acetate front",
      "Gold-tone metal bridge and temples",
      "Brown gradient lenses",
      "100% UVA/UVB protection",
      "Includes leather case and cloth",
      "Made in Italy",
    ],
    images: [{ src: unsplash("1508296695146-257a814070b4"), alt: "Blush cat-eye sunglasses with gradient lenses on a white surface" }],
  },
  {
    slug: "half-rim-optical-frames",
    name: "Half-rim optical frames",
    category: "eyewear",
    priceCents: 38000,
    colour: "Tortoiseshell",
    stock: 8,
    description:
      "Browline frames pairing a tortoiseshell acetate brow with a slim gold-tone lower rim. Supplied with demo lenses, ready to be fitted with your prescription.",
    details: [
      "Tortoiseshell acetate brow",
      "Gold-tone metal rim and bridge",
      "Adjustable nose pads",
      "Prescription-ready",
      "Includes hard case and cloth",
      "Made in Japan",
    ],
    images: [
      { src: unsplash("1574258495973-f010dfbb5371"), alt: "Tortoiseshell and gold half-rim glasses resting on a white book" },
    ],
  },
  {
    slug: "crescent-pendant-necklace",
    name: "Crescent pendant necklace",
    category: "jewelry",
    priceCents: 98000,
    colour: "Gold",
    stock: 4,
    description:
      "Two fine chains worn together: one with a stone-set crescent moon, the other with a faceted blue topaz drop. Wear them layered or on their own.",
    details: [
      "18k gold vermeil on sterling silver",
      "Crescent set with white sapphires",
      "Faceted blue topaz pendant",
      "Chains: 45 cm and 55 cm",
      "Lobster clasp",
      "Made in London",
    ],
    images: [
      { src: unsplash("1599643478518-a784e5dc4c8f"), alt: "Layered gold necklaces with a crescent pendant and a blue stone drop" },
    ],
  },
  {
    slug: "sapphire-drop-earrings",
    name: "Sapphire drop earrings",
    category: "jewelry",
    priceCents: 145000,
    colour: "Silver / Sapphire",
    stock: 2,
    description:
      "Statement drop earrings with a pear-cut blue sapphire framed by baguette and round-cut crystals. Made for evenings, light enough for all of them.",
    details: [
      "Rhodium-plated sterling silver",
      "Pear-cut lab-grown sapphire",
      "Baguette and round-cut crystals",
      "Post-back fastening",
      "Drop length: 6 cm",
      "Made in Italy",
    ],
    images: [
      { src: unsplash("1535632066927-ab7c9ab60908"), alt: "Pair of sapphire and crystal drop earrings on a green leaf" },
    ],
  },
  {
    slug: "leather-monk-strap-shoes",
    name: "Leather monk-strap shoes",
    category: "shoes",
    priceCents: 79000,
    colour: "Cognac",
    stock: 7,
    description:
      "Double monk-strap shoes in hand-burnished calfskin with a sleek cap toe. Goodyear-welted on a leather sole, so they can be resoled for years.",
    details: [
      "Hand-burnished calfskin",
      "Double buckle strap",
      "Cap toe",
      "Goodyear-welted leather sole",
      "Leather lining",
      "Made in Spain",
    ],
    images: [
      { src: unsplash("1533867617858-e7b97e060509"), alt: "Pair of cognac double monk-strap leather shoes on a wooden floor" },
    ],
  },
  {
    slug: "leather-lace-up-boots",
    name: "Leather lace-up boots",
    category: "shoes",
    priceCents: 95000,
    colour: "Dark brown",
    stock: 10,
    description:
      "Ankle boots in waxed leather that weathers beautifully, with a toe cap, speed hooks and a commando rubber sole for grip in every season.",
    details: [
      "Waxed full-grain leather",
      "Lace-up with speed hooks",
      "Toe cap",
      "Commando rubber sole",
      "Leather lining",
      "Made in Portugal",
    ],
    images: [
      { src: unsplash("1608256246200-53e635b5b65f"), alt: "Pair of dark brown leather lace-up ankle boots on a pale plinth" },
    ],
  },
  {
    slug: "belted-leather-tote",
    name: "Belted leather tote",
    category: "bags",
    priceCents: 185000,
    colour: "Multi",
    stock: 5,
    description:
      "A structured top-handle tote wrapped in four buckled leather belts in black, red, taupe and tan. Zips closed and holds a laptop.",
    details: [
      "Pebbled calfskin leather",
      "Four buckled leather belts",
      "Rolled top handles",
      "Zip top closure",
      "Dimensions: 34 × 24 × 14 cm",
      "Made in Italy",
    ],
    images: [
      { src: unsplash("1628149455678-16f37bc392f4"), alt: "Hand holding a tote wrapped in black, red, taupe and tan leather belts" },
    ],
  },
  {
    slug: "canvas-day-backpack",
    name: "Canvas day backpack",
    category: "bags",
    priceCents: 42000,
    colour: "Charcoal",
    stock: 16,
    description:
      "A pared-back backpack in waxed cotton canvas with a front zip pocket and padded laptop sleeve. Water-resistant and soft enough to fold flat.",
    details: [
      "Waxed cotton canvas",
      "Front zip pocket",
      "Padded 15\" laptop sleeve",
      "Adjustable shoulder straps",
      "Dimensions: 42 × 30 × 13 cm",
      "Made in Portugal",
    ],
    images: [{ src: unsplash("1581605405669-fcdf81165afa"), alt: "Hand holding up a charcoal canvas backpack against a white wall" }],
  },
  {
    slug: "tangerine-crew-sweater",
    name: "Tangerine crew sweater",
    category: "knitwear",
    priceCents: 59000,
    colour: "Tangerine",
    stock: 13,
    description:
      "A relaxed crew-neck sweater in a soft, fine-gauge cotton knit. The dropped shoulder and ribbed trims make it as easy over a shirt as it is on its own.",
    details: [
      "Fine-gauge cotton knit",
      "Ribbed crew neck, cuffs and hem",
      "Dropped shoulders, relaxed fit",
      "100% organic cotton",
      "Machine wash cold, dry flat",
      "Made in Portugal",
    ],
    images: [{ src: unsplash("1578587018452-892bacefd3f2"), alt: "Woman in a tangerine crew-neck sweater and blue jeans" }],
  },
  {
    slug: "striped-fringed-scarf",
    name: "Striped fringed scarf",
    category: "knitwear",
    priceCents: 29000,
    colour: "Berry stripe",
    stock: 20,
    description:
      "A long, lightweight scarf knitted in fine stripes of berry, slate and plum, finished with a loose fringe at each end. Wraps twice without bulk.",
    details: [
      "Fine striped knit",
      "Fringed ends",
      "200 × 35 cm",
      "60% wool, 40% silk",
      "Hand wash cold",
      "Made in Scotland",
    ],
    images: [{ src: unsplash("1609803384069-19f3e5a70e75"), alt: "Coiled striped knit scarf in berry and slate with a fringed end" }],
  },
  {
    slug: "satin-bomber-jacket",
    name: "Satin bomber jacket",
    category: "outerwear",
    priceCents: 135000,
    colour: "Rust",
    stock: 6,
    description:
      "A lightweight bomber in washed satin with a rib-knit collar, cuffs and hem, and a utility pocket on the sleeve. Layers over knitwear from spring to autumn.",
    details: [
      "Washed satin shell",
      "Rib-knit collar, cuffs and hem",
      "Two-way front zip",
      "Zipped sleeve pocket",
      "Lightly padded lining",
      "Dry clean only",
      "Made in Italy",
    ],
    images: [{ src: unsplash("1591047139829-d91aecb6caea"), alt: "Rust satin bomber jacket held up on a white hanger" }],
  },
  {
    slug: "hooded-duffle-coat",
    name: "Hooded duffle coat",
    category: "outerwear",
    priceCents: 210000,
    colour: "Scarlet",
    stock: 9,
    description:
      "A traditional duffle coat in boiled wool with a generous hood and patch pockets, cut a little shorter for a modern line. Warm without weight.",
    details: [
      "Boiled wool",
      "Attached hood",
      "Toggle front fastening",
      "Patch pockets",
      "Tartan-lined",
      "Dry clean only",
      "Made in England",
    ],
    images: [{ src: unsplash("1604644401890-0bd678c83788"), alt: "Rail of scarlet and navy hooded wool duffle coats" }],
  },
  {
    slug: "sherpa-collar-denim-jacket",
    name: "Sherpa-collar denim jacket",
    category: "outerwear",
    priceCents: 89000,
    colour: "Light wash",
    stock: 11,
    description:
      "A classic trucker jacket in rigid light-wash denim with a detachable shearling-effect collar. Softens and fades with every wear.",
    details: [
      "Rigid cotton denim",
      "Detachable sherpa collar",
      "Button front and chest pockets",
      "Hand-warmer side pockets",
      "Machine wash cold, inside out",
      "Made in Japan",
    ],
    images: [
      { src: unsplash("1543076447-215ad9ba6923"), alt: "Light-wash denim jacket with a sherpa collar hanging on a white wall" },
    ],
  },
  {
    slug: "floral-belted-dress",
    name: "Floral belted dress",
    category: "ready-to-wear",
    priceCents: 129000,
    colour: "Poppy",
    stock: 4,
    description:
      "A full-skirted midi dress in a poppy-red floral crêpe, with flutter sleeves and a wide woven belt that cinches the waist.",
    details: [
      "Printed viscose crêpe",
      "V-neckline with flutter sleeves",
      "Full pleated skirt, midi length",
      "Detachable woven belt",
      "Concealed side zip",
      "Dry clean only",
      "Made in Italy",
    ],
    images: [
      { src: unsplash("1572804013309-59a88b7e92f1"), alt: "Woman in a poppy-red floral midi dress with a woven belt" },
    ],
  },
  {
    slug: "navy-wool-suit",
    name: "Navy wool suit",
    category: "ready-to-wear",
    priceCents: 285000,
    colour: "Navy",
    stock: 5,
    description:
      "A single-breasted two-piece suit in fine Super 120s wool, with a soft shoulder and a slim, tapered trouser. The one suit that does everything.",
    details: [
      "Super 120s wool",
      "Single-breasted, two buttons",
      "Notch lapels",
      "Half-canvassed jacket",
      "Flat-front tapered trousers",
      "Dry clean only",
      "Made in Italy",
    ],
    images: [{ src: unsplash("1610652492500-ded49ceeb378"), alt: "Man in a navy wool suit and tie adjusting his jacket" }],
  },
  {
    slug: "windowpane-check-suit",
    name: "Windowpane check suit",
    category: "ready-to-wear",
    priceCents: 325000,
    colour: "Cobalt check",
    stock: 2,
    description:
      "A three-piece suit in cobalt wool flannel with a fine windowpane check: jacket, waistcoat and trousers, made to be worn together or apart.",
    details: [
      "Wool flannel, windowpane check",
      "Jacket, waistcoat and trousers",
      "Peak lapels",
      "Ticket pocket",
      "Half-canvassed jacket",
      "Dry clean only",
      "Made in England",
    ],
    images: [
      { src: unsplash("1594938298603-c8148c4dae35"), alt: "Man in a cobalt windowpane-check three-piece suit" },
    ],
  },
  {
    slug: "fleece-jogging-set",
    name: "Fleece jogging set",
    category: "ready-to-wear",
    priceCents: 49000,
    colour: "Marigold",
    stock: 0,
    description:
      "A cropped hoodie and relaxed jogger in brushed-back cotton fleece, dyed a bright marigold. Sold as a set; soft enough to live in.",
    details: [
      "Brushed-back cotton fleece",
      "Cropped hoodie with drawstring hood",
      "Relaxed jogger with elastic cuffs",
      "Sold as a two-piece set",
      "Machine wash cold",
      "Made in Portugal",
    ],
    images: [{ src: unsplash("1515886657613-9f3515b0c78f"), alt: "Woman in a marigold cropped hoodie and joggers by the sea" }],
  },
  {
    slug: "crystal-round-sunglasses",
    name: "Crystal round sunglasses",
    category: "eyewear",
    priceCents: 42000,
    colour: "Crystal",
    stock: 9,
    description:
      "Softly rounded sunglasses in clear crystal acetate with warm brown lenses and fine gold-tone rivets. Light, easy and flattering on most faces.",
    details: [
      "Crystal acetate frame",
      "Brown lenses",
      "Gold-tone rivets",
      "100% UVA/UVB protection",
      "Includes leather case and cloth",
      "Made in Italy",
    ],
    images: [
      { src: unsplash("1577803645773-f96470509666"), alt: "Clear crystal round sunglasses with brown lenses on a boat deck" },
    ],
  },
  {
    slug: "diamond-halo-ring",
    name: "Diamond halo ring",
    category: "jewelry",
    priceCents: 385000,
    colour: "Rose gold",
    stock: 1,
    description:
      "A round brilliant-cut lab-grown diamond framed by a halo of pavé stones, on a split band set with more. Made to order in our London workshop.",
    details: [
      "18k rose gold",
      "0.75 ct lab-grown centre diamond",
      "Pavé halo and split shank",
      "Sizes J–Q",
      "Presented in a signature box",
      "Made in London",
    ],
    images: [{ src: unsplash("1605100804763-247f67b3557e"), alt: "Rose-gold diamond halo ring on a black surface" }],
  },
  {
    slug: "crystal-paisley-bangle",
    name: "Crystal paisley bangle",
    category: "jewelry",
    priceCents: 64000,
    colour: "Rose gold",
    stock: 7,
    description:
      "An openwork bangle of interlocking paisley links, each set with fine crystals that catch the light as the wrist moves.",
    details: [
      "Rose-gold plated brass",
      "Hand-set crystals",
      "Hinged with a hidden clasp",
      "Inner diameter: 6 cm",
      "Made in Italy",
    ],
    images: [{ src: unsplash("1611591437281-460bfbe1220a"), alt: "Rose-gold paisley bangle set with crystals on a pink background" }],
  },
  {
    slug: "suede-court-shoes",
    name: "Suede court shoes",
    category: "shoes",
    priceCents: 68000,
    colour: "Midnight",
    stock: 8,
    description:
      "Pointed court shoes in midnight-blue suede on a slim 90 mm heel, with a cushioned leather insole for long days and late nights.",
    details: [
      "Kid suede upper",
      "Pointed toe",
      "90 mm covered heel",
      "Cushioned leather insole",
      "Leather sole",
      "Made in Italy",
    ],
    images: [{ src: unsplash("1515347619252-60a4bf4fff4f"), alt: "Hand holding a pair of midnight-blue suede court shoes" }],
  },
  {
    slug: "leather-chukka-boots",
    name: "Leather chukka boots",
    category: "shoes",
    priceCents: 72000,
    colour: "Tan",
    stock: 12,
    description:
      "Two-eyelet chukka boots in burnished calf leather on a light rubber sole. As right with tailoring as they are with jeans.",
    details: [
      "Burnished calf leather",
      "Two-eyelet lacing",
      "Unlined for a soft fit",
      "Lightweight rubber sole",
      "Made in Spain",
    ],
    images: [{ src: unsplash("1449505278894-297fdb3edbc1"), alt: "Pair of tan leather chukka boots on a wooden floor" }],
  },
];
