import type { Metadata } from "next";
import { Suspense, ViewTransition } from "react";

import { AdminComingNext, AdminHeader, AdminSectionSkeleton } from "@/components/admin/admin-page";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Products — Admin — Atelier Store", robots: { index: false } };

/** Admin: products. requireAdmin() inside <Suspense>: signed out → sign-in, not an admin → 404. */
export default function AdminProductsPage() {
  return (
    <>
      <Breadcrumbs className="mb-6 md:mb-10" items={[{ label: "Home", href: "/" }, { label: "Admin", href: "/admin" }, { label: "Products" }]} />
      <Suspense
        fallback={
          <ViewTransition exit="slide-down" default="none">
            <AdminSectionSkeleton label="Loading products" />
          </ViewTransition>
        }
      >
        <ViewTransition enter="slide-up" default="none">
          <ProductsContent />
        </ViewTransition>
      </Suspense>
    </>
  );
}

async function ProductsContent() {
  await requireAdmin("/admin/products");
  return (
    <>
      <AdminHeader title="Products" intro="Browse, create and edit the catalogue." />
      <AdminComingNext>Product management arrives in the next step.</AdminComingNext>
    </>
  );
}
