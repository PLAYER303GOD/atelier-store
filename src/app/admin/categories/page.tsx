import type { Metadata } from "next";
import { Suspense, ViewTransition } from "react";

import { AdminComingNext, AdminHeader, AdminSectionSkeleton } from "@/components/admin/admin-page";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Categories — Admin — Atelier Store", robots: { index: false } };

/** Admin: categories. requireAdmin() inside <Suspense>: signed out → sign-in, not an admin → 404. */
export default function AdminCategoriesPage() {
  return (
    <>
      <Breadcrumbs className="mb-6 md:mb-10" items={[{ label: "Home", href: "/" }, { label: "Admin", href: "/admin" }, { label: "Categories" }]} />
      <Suspense
        fallback={
          <ViewTransition exit="slide-down" default="none">
            <AdminSectionSkeleton label="Loading categories" />
          </ViewTransition>
        }
      >
        <ViewTransition enter="slide-up" default="none">
          <CategoriesContent />
        </ViewTransition>
      </Suspense>
    </>
  );
}

async function CategoriesContent() {
  await requireAdmin("/admin/categories");
  return (
    <>
      <AdminHeader title="Categories" intro="Group products into the store's categories." />
      <AdminComingNext>Category management arrives in a later step.</AdminComingNext>
    </>
  );
}
