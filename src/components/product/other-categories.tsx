import Link from "next/link";

import { MediaFrame } from "@/components/ui/media-frame";
import { SectionHeader } from "@/components/ui/section-header";
import { SmoothImage } from "@/components/ui/smooth-image";
import { categoryHref } from "@/lib/catalog";
import type { CategorySummary } from "@/lib/products";

/**
 * "Explore other categories" row at the foot of a category page. Same tile treatment as the
 * homepage's featured collections: a swipeable row on mobile, a 3-column grid from 768px and
 * one row of however many categories there are from 1280px.
 */
export function OtherCategories({
  categories,
  eyebrow = "Keep exploring",
  title = "Other categories",
  className = "container-page pb-section",
}: {
  categories: CategorySummary[];
  eyebrow?: string;
  title?: string;
  className?: string;
}) {
  if (categories.length === 0) return null;

  return (
    <section aria-labelledby="other-categories-title" className={className}>
      <SectionHeader id="other-categories-title" eyebrow={eyebrow} title={title} />
      <ul
        role="list"
        className="reveal no-scrollbar -mx-gutter grid snap-x snap-mandatory auto-cols-[45%] grid-flow-col gap-x-0.5 overflow-x-auto scroll-px-gutter px-gutter sm:auto-cols-[30%] md:mx-0 md:grid-flow-row md:grid-cols-3 md:gap-y-8 md:overflow-visible md:px-0 xl:auto-cols-fr xl:grid-flow-col"
      >
        {categories.map((category) => (
          <li key={category.slug} className="snap-start">
            <Link href={categoryHref(category.slug)} className="group block">
              <MediaFrame ratio="product">
                <SmoothImage
                  src={category.cover.src}
                  alt=""
                  fill
                  sizes="(min-width: 1280px) 17vw, (min-width: 768px) 33vw, (min-width: 640px) 30vw, 45vw"
                  className="object-cover transition-[opacity,scale] duration-700 ease-out-soft group-hover:scale-[1.03]"
                />
              </MediaFrame>
              <div className="px-1 pt-3 md:pt-4">
                <h3 className="text-body group-hover:underline group-hover:underline-offset-4">{category.name}</h3>
                <p className="mt-1 text-body-sm text-muted">
                  {category.count} {category.count === 1 ? "piece" : "pieces"}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
