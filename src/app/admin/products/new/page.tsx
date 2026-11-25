import type { Metadata } from "next";
import { Suspense, ViewTransition } from "react";

import { AdminHeader, AdminSectionSkeleton } from "@/components/admin/admin-page";
import { ProductForm } from "@/components/admin/product-form";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { listCategoryOptions } from "@/lib/admin";
import { EMPTY_PRODUCT_FORM } from "@/lib/admin-validation";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "New product — Admin — Atelier Store", robots: { index: false } };

/** Admin: create a product. requireAdmin() here; the createProduct action checks again itself. */
export default function NewProductPage() {
  return (
    <>
      <Breadcrumbs
        className="mb-6 md:mb-10"
        items={[{ label: "Home", href: "/" }, { label: "Admin", href: "/admin" }, { label: "Products", href: "/admin/products" }, { label: "New product" }]}
      />
      <Suspense
        fallback={
          <ViewTransition exit="slide-down" default="none">
            <AdminSectionSkeleton label="Loading the product form" />
          </ViewTransition>
        }
      >
        <ViewTransition enter="slide-up" default="none">
          <NewProductContent />
        </ViewTransition>
      </Suspense>
    </>
  );
}

async function NewProductContent() {
  await requireAdmin("/admin/products/new");
  const categories = await listCategoryOptions();
  return (
    <>
      <AdminHeader title="New product" intro="It appears in the store as soon as it's created, unless you choose Hidden." />
      <ProductForm mode="create" categories={categories} initial={EMPTY_PRODUCT_FORM} />
    </>
  );
}
