import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, ViewTransition } from "react";

import { AdminHeader, AdminSectionSkeleton } from "@/components/admin/admin-page";
import { ProductForm } from "@/components/admin/product-form";
import { StockAdjust } from "@/components/admin/stock-adjust";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { TextLink } from "@/components/ui/text-link";
import { getAdminProduct, listCategoryOptions } from "@/lib/admin";
import { centsToPriceInput, PRODUCT_SLUG_PATTERN } from "@/lib/admin-validation";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Edit product — Admin — Atelier Store", robots: { index: false } };

/**
 * Admin: edit one product, /admin/products/edit?product=<slug> (a query parameter, not a [slug]
 * segment: see the admin layout). requireAdmin() here; updateProduct / adjustProductStock check
 * again themselves.
 */
export default function EditProductPage({ searchParams }: PageProps<"/admin/products/edit">) {
  return (
    <Suspense
      fallback={
        <ViewTransition exit="slide-down" default="none">
          <AdminSectionSkeleton label="Loading the product" />
        </ViewTransition>
      }
    >
      <ViewTransition enter="slide-up" default="none">
        <EditProductContent searchParams={searchParams} />
      </ViewTransition>
    </Suspense>
  );
}

async function EditProductContent({ searchParams }: Pick<PageProps<"/admin/products/edit">, "searchParams">) {
  const { product: slug, created } = await searchParams;
  await requireAdmin(`/admin/products/edit?product=${encodeURIComponent(String(slug ?? ""))}`);
  if (typeof slug !== "string" || !PRODUCT_SLUG_PATTERN.test(slug)) notFound();

  const [product, categories] = await Promise.all([getAdminProduct(slug), listCategoryOptions()]);
  if (!product) notFound();

  return (
    <>
      <Breadcrumbs
        className="mb-6 md:mb-10"
        items={[{ label: "Home", href: "/" }, { label: "Admin", href: "/admin" }, { label: "Products", href: "/admin/products" }, { label: product.name }]}
      />
      {created === "1" && (
        <p role="status" className="mb-8 border-l-2 border-success bg-surface px-4 py-3 text-body-sm">
          Product created.{" "}
          {product.status === "active" ? "It's live in the store." : "It's hidden until you set it to Available."}
        </p>
      )}
      <AdminHeader
        title={product.name}
        intro={product.status === "hidden" ? "Hidden: customers can't see or buy it." : "Available in the store."}
        action={
          product.status === "active" ? (
            <TextLink href={`/products/${product.slug}`} variant="cta">
              View in store
            </TextLink>
          ) : undefined
        }
      />

      <section aria-labelledby="stock-title" className="mb-10 border-b pb-10">
        <h2 id="stock-title" className="mb-6 text-title">
          Stock
        </h2>
        <StockAdjust slug={product.slug} stock={product.stock} held={product.held} />
      </section>

      <ProductForm
        mode="edit"
        categories={categories}
        updatedAt={product.updatedAt}
        initial={{
          name: product.name,
          slug: product.slug,
          categorySlug: product.categorySlug,
          price: centsToPriceInput(product.priceCents),
          colour: product.colour,
          description: product.description,
          details: product.details.join("\n"),
          badge: product.badge ?? "",
          status: product.status,
          images: product.images,
          initialStock: "0",
        }}
      />
    </>
  );
}
