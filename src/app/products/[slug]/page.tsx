import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, ViewTransition } from "react";

import { ProductDetail, ProductDetailSkeleton } from "@/components/product/product-detail";
import { getProduct, getProductSlugs, getRelatedProducts } from "@/lib/products";

// Every product in the database is prerendered; unknown slugs fall through to notFound().
// Cache Components needs at least one slug here, so migrate and seed before `next build`.
export async function generateStaticParams() {
  return (await getProductSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return {};
  return { title: `${product.name} — Atelier Store`, description: product.description };
}

/*
 * `params` is URL data. With partialPrefetching, reading it outside <Suspense> would tie
 * the shared App Shell to one URL, so the page passes the promise down unawaited and
 * the product resolves inside the boundary.
 */
export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <Suspense
      fallback={
        // Skeleton leaves quickly (slide-down), content arrives gently (slide-up); see globals.css.
        <ViewTransition exit="slide-down" default="none">
          <ProductDetailSkeleton />
        </ViewTransition>
      }
    >
      <ViewTransition enter="slide-up" default="none">
        <ProductContent params={params} />
      </ViewTransition>
    </Suspense>
  );
}

async function ProductContent({ params }: Pick<PageProps<"/products/[slug]">, "params">) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  const related = await getRelatedProducts(product);
  return <ProductDetail product={product} related={related} />;
}
