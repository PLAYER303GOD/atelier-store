import Link from "next/link";

import { ProductCard } from "@/components/product/product-card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonStyles } from "@/components/ui/button";
import { MediaFrame } from "@/components/ui/media-frame";
import { ProductGrid } from "@/components/ui/product-grid";
import type { Product } from "@/lib/catalog";

type ProductListingProps = {
  /** Current page's crumb label; "Home" is prepended. */
  crumb: string;
  eyebrow: string;
  title: string;
  /** Optional intro under the heading (collections). */
  description?: string;
  products: Product[];
  /** Appended to the count, e.g. "newest first". */
  note?: string;
  empty: { title: string; body: string };
};

/** Shared spacing so the page and its skeleton line up exactly. */
const pageClass = "container-page pt-4 pb-section md:pt-6";

/** Listing page body: breadcrumbs, heading, count and a product grid (or an empty state). */
export function ProductListing({ crumb, eyebrow, title, description, products, note, empty }: ProductListingProps) {
  const count = `${products.length} ${products.length === 1 ? "piece" : "pieces"}`;

  return (
    <div className={pageClass}>
      <Breadcrumbs className="mb-6 md:mb-10" items={[{ label: "Home", href: "/" }, { label: crumb }]} />
      <p className="mb-2 text-caption text-muted uppercase">{eyebrow}</p>
      <h1 className="mb-2 text-display-sm">{title}</h1>
      {description && <p className="mt-3 mb-4 max-w-xl text-body text-muted">{description}</p>}

      {products.length === 0 ? (
        <div className="mt-8 flex flex-col items-center border-t py-section text-center md:mt-10">
          <p className="text-title">{empty.title}</p>
          <p className="mt-3 max-w-sm text-body text-muted">{empty.body}</p>
          <Link href="/new-in" className={`${buttonStyles({ variant: "secondary" })} mt-8`}>
            Shop new arrivals
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-8 text-body-sm text-muted md:mb-10">{note ? `${count}, ${note}.` : `${count}.`}</p>
          <ProductGrid aria-label={title}>
            {products.map((product) => (
              <li key={product.slug}>
                <ProductCard product={product} />
              </li>
            ))}
          </ProductGrid>
        </>
      )}
    </div>
  );
}

/** Placeholder with the same frame as ProductListing, for <Suspense> fallbacks. */
export function ProductListingSkeleton() {
  return (
    <div className={pageClass} aria-busy="true" aria-label="Loading products">
      <div className="mb-6 h-4 w-32 bg-surface md:mb-10" />
      <div className="mb-2 h-3 w-16 bg-surface" />
      <div className="mb-2 h-9 w-56 bg-surface" />
      <div className="mb-8 h-4 w-24 bg-surface md:mb-10" />
      <ProductGrid>
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i}>
            <MediaFrame ratio="product" />
            <div className="mt-4 h-3 w-2/3 bg-surface" />
          </li>
        ))}
      </ProductGrid>
    </div>
  );
}
