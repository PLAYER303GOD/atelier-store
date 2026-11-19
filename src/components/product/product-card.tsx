import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";

import { SaveButton } from "@/components/product/save-button";
import { MediaFrame } from "@/components/ui/media-frame";
import { SmoothImage } from "@/components/ui/smooth-image";
import { formatPrice, type Product } from "@/lib/catalog";

// Covers both ProductGrid layouts (max 3 columns at 768–1279px, 4 above).
const sizes = "(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw";
const zoom = "transition-[opacity,scale] duration-700 ease-out-soft group-hover:scale-[1.03]";

/** Shared view-transition name: the card image morphs into the product page gallery. */
export const productImageTransition = (slug: string) => `product-${slug}`;

export function ProductCard({ product }: { product: Product }) {
  const [image, hoverImage] = product.images;
  const soldOut = product.stock <= 0;

  return (
    <div className="group reveal relative">
      {/* prefetch: resolves the product page ahead of the click so the image morph can play */}
      <Link href={`/products/${product.slug}`} prefetch className="block">
        <ViewTransition name={productImageTransition(product.slug)} share="morph" default="none">
          <MediaFrame ratio="product">
            <SmoothImage src={image.src} alt={image.alt} fill sizes={sizes} className={`object-cover ${zoom}`} />
            {/* Second shot on hover, pointer devices only */}
            {hoverImage && (
              <Image
                src={hoverImage.src}
                alt=""
                aria-hidden="true"
                fill
                sizes={sizes}
                className={`object-cover opacity-0 [@media(hover:hover)]:group-hover:opacity-100 ${zoom}`}
              />
            )}
            {product.badge && (
              <span className="absolute top-3 left-3 bg-paper px-2 py-1 text-caption uppercase">
                {product.badge}
              </span>
            )}
          </MediaFrame>
        </ViewTransition>
        <div className="space-y-1 px-1 pt-3 md:pt-4">
          <p className="text-caption text-muted uppercase">{product.category.name}</p>
          <h3 className="text-body-sm group-hover:underline group-hover:underline-offset-4">{product.name}</h3>
          <p className="text-body-sm tabular-nums">
            {formatPrice(product.priceCents)}
            {soldOut && <span className="text-muted"> · Out of stock</span>}
          </p>
        </div>
      </Link>
      <SaveButton slug={product.slug} name={product.name} variant="icon" className="absolute top-2 right-2" />
    </div>
  );
}
