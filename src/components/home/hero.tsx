import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";
import { FullBleedHero } from "@/components/ui/full-bleed-hero";
import { TextLink } from "@/components/ui/text-link";
import { hero } from "@/lib/catalog";

/** Homepage campaign hero; the campaign story lives at /journal/the-quiet-season. */
export function Hero() {
  return (
    <FullBleedHero id="hero-title" eyebrow={hero.eyebrow} title={hero.title} body={hero.body} image={hero.image}>
      <Link href="/collections/autumn-winter" className={buttonStyles({ variant: "inverse" })}>
        Shop the collection
      </Link>
      <TextLink
        href="/journal/the-quiet-season"
        variant="cta"
        className="self-center focus-visible:outline-paper sm:self-auto"
      >
        Discover the campaign
      </TextLink>
    </FullBleedHero>
  );
}
