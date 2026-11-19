import Image from "next/image";
import { ViewTransition } from "react";

import { productImageTransition } from "@/components/product/product-card";
import { MediaFrame } from "@/components/ui/media-frame";
import { SmoothImage } from "@/components/ui/smooth-image";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/catalog";

/**
 * Mobile: full-bleed images; with several, a swipeable row where the next image peeks in.
 * From 768px: images stacked vertically in the left column, scrolling past the sticky info.
 * The first image is the morph target for the product card (shared view-transition name).
 */
export function ProductGallery({ product }: { product: Product }) {
  const multiple = product.images.length > 1;
  const sizes = multiple ? "(min-width: 768px) 58vw, 88vw" : "(min-width: 768px) 58vw, 100vw";
  const [first, ...rest] = product.images;

  return (
    <ul
      role="list"
      aria-label={`${product.name} images`}
      className={cn(
        "-mx-gutter md:mx-0 md:grid md:gap-0.5",
        multiple &&
          "no-scrollbar grid snap-x snap-mandatory auto-cols-[88%] grid-flow-col gap-0.5 overflow-x-auto md:auto-cols-auto md:grid-flow-row md:overflow-visible",
      )}
    >
      <li className="snap-start">
        <ViewTransition name={productImageTransition(product.slug)} share="morph" default="none">
          <MediaFrame ratio="product">
            {/* Not faded in: it must be visible for the morph to land on it. */}
            <Image src={first.src} alt={first.alt} fill preload sizes={sizes} className="object-cover" />
          </MediaFrame>
        </ViewTransition>
      </li>
      {rest.map((image) => (
        <li key={image.src} className="snap-start">
          <MediaFrame ratio="product">
            <SmoothImage src={image.src} alt={image.alt} fill sizes={sizes} className="object-cover" />
          </MediaFrame>
        </li>
      ))}
    </ul>
  );
}
