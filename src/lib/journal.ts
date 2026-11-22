// Journal stories: editorial content, kept in code like the homepage copy in catalog.ts.
// Each story has its own static route under src/app/journal/<slug>/ (see journal-story.tsx).
// Photos are reused from the catalogue, already checked at full size for brand marks.

import { editorial, hero, type Image, unsplash } from "@/lib/catalog";

export type StoryBlock =
  | { type: "text"; heading?: string; paragraphs: string[] }
  | { type: "image"; image: Image; caption?: string }
  | { type: "pair"; images: [Image, Image]; caption?: string }
  | { type: "quote"; text: string; cite?: string };

export type Story = {
  slug: string;
  /** Small uppercase line above the title, e.g. "Campaign · Autumn–Winter 2026". */
  eyebrow: string;
  title: string;
  standfirst: string;
  date: string;
  readingTime: string;
  image: Image;
  blocks: StoryBlock[];
  shop: { title: string; products: string[]; cta: { label: string; href: string } };
};

export const stories: Story[] = [
  {
    slug: "the-quiet-season",
    eyebrow: "Campaign · Autumn–Winter 2026",
    title: "The Quiet Season",
    standfirst: hero.body,
    date: "October 2026",
    readingTime: "4 min read",
    image: hero.image,
    blocks: [
      {
        type: "text",
        paragraphs: [
          "Every autumn we begin with the same question: what would you reach for on the first cold morning, and still want to wear in ten years? This season's answer is quiet. Fewer pieces, heavier cloth, colours taken from wet stone, bracken and woodsmoke.",
          "The collection was built around layering. Knits are cut to sit under a coat without bulk, coats are cut to sit over a jacket without strain, and everything is meant to be mixed with what is already in your wardrobe.",
        ],
      },
      {
        type: "pair",
        images: [
          { src: unsplash("1631541909061-71e349d1f203"), alt: "Oatmeal chunky rib-knit sweater on a wooden hanger" },
          { src: unsplash("1580331451062-99ff652288d7"), alt: "Woman in an oversized forest-green cable-knit jumper" },
        ],
        caption: "Chunky rib sweater in oatmeal; cable-knit jumper in forest green.",
      },
      {
        type: "text",
        heading: "Softened tailoring",
        paragraphs: [
          "Our tailoring loses its armour this season. Shoulders are lightly padded or not at all, lapels are a touch wider, and blazers are cut long enough to wear open over a knit.",
          "The check wool blazer is the piece we keep coming back to: double-breasted, slightly oversized, in a glen check fine enough to read as grey from across a room.",
        ],
      },
      {
        type: "image",
        image: { src: unsplash("1539533018447-63fcce2678e3"), alt: "Woman in a camel belted wrap coat sitting on stone steps" },
        caption: "The belted wrap coat in camel double-faced wool.",
      },
      {
        type: "quote",
        text: "We wanted clothes that feel like the hour before the city wakes up — calm, a little cold, entirely your own.",
        cite: "The Atelier design studio",
      },
      {
        type: "text",
        heading: "Made to be kept",
        paragraphs: [
          "Everything in the collection is made in small runs by the workshops we have worked with for years, in Italy, Portugal, Scotland and Spain. Boots are Goodyear-welted so they can be resoled; knits are finished by hand so they can be mended.",
          "Buy less, choose well, keep it longer. It is not a new idea, but it is still the right one.",
        ],
      },
      {
        type: "pair",
        images: [
          { src: unsplash("1608256246200-53e635b5b65f"), alt: "Pair of dark brown leather lace-up ankle boots on a pale plinth" },
          { src: unsplash("1609803384069-19f3e5a70e75"), alt: "Coiled striped knit scarf in berry and slate with a fringed end" },
        ],
        caption: "Leather lace-up boots; striped fringed scarf in wool and silk.",
      },
    ],
    shop: {
      title: "Shop the campaign",
      products: ["chunky-rib-sweater", "cable-knit-jumper", "check-wool-blazer", "belted-wrap-coat"],
      cta: { label: "Shop the collection", href: "/collections/autumn-winter" },
    },
  },
  {
    slug: "made-to-travel",
    eyebrow: "The journal · Outerwear",
    title: editorial.title,
    standfirst:
      "A coat cut from double-faced wool, a scarf in brushed cashmere: how our outerwear is designed in small runs and finished by hand.",
    date: "November 2026",
    readingTime: "3 min read",
    image: editorial.image,
    blocks: [
      {
        type: "text",
        paragraphs: [
          "A good coat is the one piece of clothing that travels with you everywhere for half the year. It has to be warm without weight, smart without fuss, and forgiving of the bag strap, the train seat and the sudden downpour.",
          "So we design our outerwear the slow way: in small runs, with the same few mills and workshops, and with more hand-finishing than most people would ever notice.",
        ],
      },
      {
        type: "image",
        image: { src: unsplash("1604644401890-0bd678c83788"), alt: "Rail of scarlet and navy hooded wool duffle coats" },
        caption: "Hooded duffle coats in boiled wool, waiting for their toggles.",
      },
      {
        type: "text",
        heading: "Double-faced wool",
        paragraphs: [
          "Double-faced wool is two layers of cloth woven together, so the coat needs no lining at all. It falls more softly, weighs less, and can be cut with raw, hand-felled edges that a lined coat would hide.",
          "It is slow to make — every seam is opened by hand and stitched closed again — which is exactly why so few coats are made this way.",
        ],
      },
      {
        type: "pair",
        images: [
          { src: unsplash("1539533018447-63fcce2678e3"), alt: "Woman in a camel belted wrap coat sitting on stone steps" },
          { src: unsplash("1609803384069-19f3e5a70e75"), alt: "Coiled striped knit scarf in berry and slate with a fringed end" },
        ],
        caption: "Belted wrap coat in camel; striped fringed scarf.",
      },
      {
        type: "quote",
        text: "From the first cold morning to the last, it should move with you — and look better every year it does.",
        cite: "On the brief for every coat we make",
      },
      {
        type: "text",
        heading: "Finished by hand",
        paragraphs: [
          "Buttonholes are worked by hand, collars are shaped over a tailor's ham, and every coat is pressed and checked by the person who finished it. It takes days rather than hours.",
          "The result is outerwear that is quiet about its quality, and that you will still be wearing long after the season that introduced it.",
        ],
      },
    ],
    shop: {
      title: "Shop the story",
      products: ["belted-wrap-coat", "hooded-duffle-coat", "striped-fringed-scarf", "hooded-field-jacket"],
      cta: { label: "Shop outerwear", href: "/outerwear" },
    },
  },
];

export function getStory(slug: string): Story {
  const story = stories.find((s) => s.slug === slug);
  if (!story) throw new Error(`Unknown journal story "${slug}"`);
  return story;
}
