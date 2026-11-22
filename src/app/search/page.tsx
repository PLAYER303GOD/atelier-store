import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, ViewTransition } from "react";

import { OtherCategories } from "@/components/product/other-categories";
import { ProductCard } from "@/components/product/product-card";
import { SearchForm } from "@/components/product/search-form";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonStyles } from "@/components/ui/button";
import { MediaFrame } from "@/components/ui/media-frame";
import { ProductGrid } from "@/components/ui/product-grid";
import { normalizeSearchQuery } from "@/lib/catalog";
import { getCategorySummaries, searchProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "Search — Atelier Store",
  robots: { index: false }, // result pages are endless variations of the catalogue
};

/*
 * `searchParams` is URL data: the heading stays in the shared App Shell and everything that
 * depends on the query resolves inside <Suspense> (see src/app/products/[slug]/page.tsx).
 */
export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <div className="container-page pt-4 pb-section md:pt-6">
      <Breadcrumbs className="mb-6 md:mb-10" items={[{ label: "Home", href: "/" }, { label: "Search" }]} />
      <h1 className="sr-only">Search</h1>
      {/* Skeleton leaves quickly, content arrives gently (slide-down / slide-up in globals.css). */}
      <Suspense
        fallback={
          <ViewTransition exit="slide-down" default="none">
            <SearchSkeleton />
          </ViewTransition>
        }
      >
        <ViewTransition enter="slide-up" default="none">
          <SearchContent searchParams={searchParams} />
        </ViewTransition>
      </Suspense>
    </div>
  );
}

async function SearchContent({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const query = normalizeSearchQuery((await searchParams).q);
  const [results, categories] = await Promise.all([
    query ? searchProducts(query) : Promise.resolve([]),
    getCategorySummaries(),
  ]);

  return (
    <>
      {/* Remount on a new query so the box shows what was searched (incl. back/forward). */}
      <SearchForm key={query} query={query} />

      {/* role="status" announces the outcome after each client-side search. */}
      <p role="status" className="mt-4 mb-8 text-body-sm text-muted md:mb-10">
        {!query
          ? "Search by name, category, colour or material."
          : `${results.length} ${results.length === 1 ? "result" : "results"} for “${query}”`}
      </p>

      {query && results.length > 0 && (
        <ProductGrid aria-label={`Results for ${query}`}>
          {results.map((product) => (
            <li key={product.slug}>
              <ProductCard product={product} />
            </li>
          ))}
        </ProductGrid>
      )}

      {query && results.length === 0 && (
        <div className="flex flex-col items-center border-t py-section text-center">
          <p className="text-title">No pieces match “{query}”</p>
          <p className="mt-3 max-w-sm text-body text-muted">
            Check the spelling, try a broader word like “coat” or “gold”, or browse a category below.
          </p>
          <Link href="/new-in" className={`${buttonStyles({ variant: "secondary" })} mt-8`}>
            Shop new arrivals
          </Link>
        </div>
      )}

      {(!query || results.length === 0) && (
        <OtherCategories
          categories={categories}
          eyebrow="Browse"
          title="Shop by category"
          // Already inside the page container, so no container-page of its own.
          className={query ? "pt-section" : "pt-4"}
        />
      )}
    </>
  );
}

function SearchSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading search">
      <div className="h-14 border-b border-line md:h-16" />
      <div className="mt-4 mb-8 h-4 w-48 bg-surface md:mb-10" />
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
