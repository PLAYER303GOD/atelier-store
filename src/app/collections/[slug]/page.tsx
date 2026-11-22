import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, ViewTransition } from "react";

import { OtherCategories } from "@/components/product/other-categories";
import { ProductListing, ProductListingSkeleton } from "@/components/product/product-listing";
import {
  getCategorySummaries,
  getCollection,
  getCollectionProducts,
  getCollectionSlugs,
} from "@/lib/products";

// Curated collections (Women, Men, Gifts, Bags & Accessories) from the nav and homepage tiles.
// Cache Components needs at least one slug here, so migrate and seed before `next build`.
export async function generateStaticParams() {
  return (await getCollectionSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const collection = await getCollection((await params).slug);
  if (!collection) return {};
  return { title: `${collection.name} — Atelier Store`, description: collection.description };
}

// `params` is URL data: resolve it inside <Suspense> (see src/app/products/[slug]/page.tsx).
// Same frame and slide-down / slide-up transition as the category pages.
export default function CollectionPage({ params }: PageProps<"/collections/[slug]">) {
  return (
    <Suspense
      fallback={
        <ViewTransition exit="slide-down" default="none">
          <ProductListingSkeleton />
        </ViewTransition>
      }
    >
      <ViewTransition enter="slide-up" default="none">
        <CollectionContent params={params} />
      </ViewTransition>
    </Suspense>
  );
}

async function CollectionContent({ params }: Pick<PageProps<"/collections/[slug]">, "params">) {
  const slug = (await params).slug;
  const collection = await getCollection(slug);
  if (!collection) notFound();
  const [products, categories] = await Promise.all([getCollectionProducts(slug), getCategorySummaries()]);

  return (
    <>
      <ProductListing
        crumb={collection.name}
        eyebrow="Collection"
        title={collection.name}
        description={collection.description}
        note="newest first"
        products={products}
        empty={{
          title: `Nothing in ${collection.name} right now`,
          body: "New pieces arrive every season. Check back soon.",
        }}
      />
      <OtherCategories categories={categories} eyebrow="Keep exploring" title="Shop by category" />
    </>
  );
}
