import type { ReactNode } from "react";

import { HeaderOverlay } from "@/components/site/header-overlay";
import { MediaFrame } from "@/components/ui/media-frame";
import { SmoothImage } from "@/components/ui/smooth-image";
import type { Image } from "@/lib/catalog";

/** Staggers the copy's `animate-rise` entrance (motion is off with reduced motion). */
const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

type FullBleedHeroProps = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  image: Image;
  /** Buttons / links under the copy (homepage CTAs). */
  children?: ReactNode;
};

/**
 * Full-bleed campaign image: portrait on mobile, 16:9 (capped to the viewport) from 768px.
 * Sits underneath the header (`-mt-header`) and makes it transparent: <HeaderOverlay> once
 * hydrated, `data-header-overlay` for the server-rendered first paint. Render it outside any
 * <Suspense> so that attribute is in the first paint. The title is the page's <h1>.
 */
export function FullBleedHero({ id, eyebrow, title, body, image, children }: FullBleedHeroProps) {
  return (
    <section aria-labelledby={id} data-header-overlay className="relative -mt-header">
      <HeaderOverlay />
      {/* 2.25rem = announcement bar, which stays above the hero */}
      <MediaFrame ratio="hero" className="max-h-[calc(100svh-2.25rem)] min-h-[32rem] w-full">
        <SmoothImage src={image.src} alt={image.alt} fill preload sizes="100vw" className="animate-hero-zoom object-cover" />
        <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/65 via-black/15 to-transparent" />
        {/* keeps the transparent header's white text legible on bright images */}
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-48 bg-linear-to-b from-black/73 to-transparent" />
      </MediaFrame>

      <div className="absolute inset-x-0 bottom-0 pb-10 text-paper md:pb-16">
        <div className="container-page">
          <p className="mb-3 animate-rise text-caption uppercase" style={delay(100)}>
            {eyebrow}
          </p>
          <h1 id={id} className="max-w-3xl animate-rise text-display" style={delay(200)}>
            {title}
          </h1>
          <p className="mt-4 max-w-md animate-rise text-body-lg text-paper/85" style={delay(300)}>
            {body}
          </p>
          {children && (
            <div
              className="mt-8 flex animate-rise flex-col gap-4 sm:flex-row sm:items-center sm:gap-8"
              style={delay(400)}
            >
              {children}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
