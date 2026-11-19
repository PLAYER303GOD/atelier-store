import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

const ratios = {
  product: "aspect-product", // 4:5 — product tiles and gallery
  editorial: "aspect-editorial", // 3:4 — campaign / story cards
  hero: "aspect-[4/5] md:aspect-hero", // portrait on mobile, 16:9 from 768px
  square: "aspect-square",
} as const;

type MediaFrameProps = ComponentProps<"div"> & { ratio?: keyof typeof ratios };

/**
 * Fixed-ratio box on the grey surface colour, so layout never shifts while
 * images load. Put a `next/image` with `fill` inside, using `object-cover` for
 * photography or `object-contain` for cut-out product shots.
 */
export function MediaFrame({ ratio = "product", className, ...props }: MediaFrameProps) {
  return (
    <div
      className={cn("relative overflow-hidden bg-surface", ratios[ratio], className)}
      {...props}
    />
  );
}
