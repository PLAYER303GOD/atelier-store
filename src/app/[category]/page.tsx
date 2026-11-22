import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { OtherCategories } from "@/components/product/other-categories";
import { ProductListing, ProductListingSkeleton } from "@/components/product/product-listing";
import { getCategory, getCategoryProducts, getCategorySlugs, getCategorySummaries } from "@/lib/products";

// Category pages live at the root (`categoryHref` → `/knitwear`). Static routes such as
// /new-in and /saved take precedence; any other unknown first segment falls to notFound().
// Cache Components needs at least one slug here, so migrate and seed before `next build`.
export async function generateStaticParams() {
  return (await getCategorySlugs()).map((category) => ({ category }));
}

export async function generateMetadata({ params }: PageProps<"/[category]">): Promise<Metadata> {
  const category = await getCategory((await params).category);
  if (!category) return {};
  return {
    title: `${category.name} — Atelier Store`,
    description: `Shop ${category.name.toLowerCase()} at Atelier Store.`,
  };
}

// `params` is URL data: resolve it inside <Suspense> (see src/app/products/[slug]/page.tsx).
export default function CategoryPage({ params }: PageProps<"/[category]">) {
  return (
    <Suspense fallback={<ProductListingSkeleton />}>
      <CategoryContent params={params} />
    </Suspense>
  );
}

async function CategoryContent({ params }: Pick<PageProps<"/[category]">, "params">) {
  const slug = (await params).category;
  const category = await getCategory(slug);
  if (!category) notFound();
  const [products, summaries] = await Promise.all([getCategoryProducts(slug), getCategorySummaries()]);

  return (
    <>
      <ProductListing
        crumb={category.name}
        eyebrow="Category"
        title={category.name}
        note="newest first"
        products={products}
        empty={{
          title: `No ${category.name.toLowerCase()} right now`,
          body: "New pieces arrive every season. Check back soon.",
        }}
      />
      <OtherCategories categories={summaries.filter((c) => c.slug !== slug)} />
    </>
  );
}
