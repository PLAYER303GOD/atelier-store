import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

const layouts = {
  /** Category / search listings of any length: 2 → 3 (768px) → 4 (1280px) columns. */
  listing: "md:grid-cols-3 xl:grid-cols-4",
  /** Curated rows in multiples of four (homepage): 2 → 4 (768px) columns, no orphan tiles. */
  feature: "md:grid-cols-4",
} as const;

type ProductGridProps = ComponentProps<"ul"> & { layout?: keyof typeof layouts };

/**
 * Product grid. Tiles sit almost edge to edge (2px gap) so imagery reads as
 * one surface; rows get room for the name/price beneath each image.
 */
export function ProductGrid({ layout = "listing", className, ...props }: ProductGridProps) {
  return (
    <ul
      role="list"
      className={cn("grid grid-cols-2 gap-x-0.5 gap-y-8 md:gap-y-10", layouts[layout], className)}
      {...props}
    />
  );
}
