import Link from "next/link";

import { MediaFrame } from "@/components/ui/media-frame";
import { SmoothImage } from "@/components/ui/smooth-image";
import { SectionHeader } from "@/components/ui/section-header";
import { featuredCollections } from "@/lib/catalog";

/** Three editorial tiles: a swipeable row on mobile, a 3-column grid from 768px. */
export function FeaturedCollections() {
  return (
    <section aria-labelledby="collections-title" className="container-page py-section">
      <SectionHeader id="collections-title" eyebrow="Collections" title="Featured collections" />

      <ul
        role="list"
        className="reveal no-scrollbar -mx-gutter grid snap-x snap-mandatory auto-cols-[82%] grid-flow-col gap-x-0.5 overflow-x-auto scroll-px-gutter px-gutter sm:auto-cols-[45%] md:mx-0 md:grid-flow-row md:grid-cols-3 md:overflow-visible md:px-0"
      >
        {featuredCollections.map((collection) => (
          <li key={collection.slug} className="snap-start">
            <Link href={`/collections/${collection.slug}`} className="group block">
              <MediaFrame ratio="editorial">
                <SmoothImage
                  src={collection.image.src}
                  alt={collection.image.alt}
                  fill
                  sizes="(min-width: 768px) 33vw, 82vw"
                  className="object-cover transition-[opacity,scale] duration-700 ease-out-soft group-hover:scale-[1.03]"
                />
              </MediaFrame>
              <div className="px-1 pt-4">
                <h3 className="text-title">{collection.name}</h3>
                <p className="mt-1 text-body-sm text-muted">{collection.description}</p>
                <span
                  aria-hidden="true"
                  className="mt-3 inline-block text-label font-medium uppercase underline decoration-1 underline-offset-[6px] transition-[text-decoration-color] group-hover:decoration-transparent"
                >
                  Shop now
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
