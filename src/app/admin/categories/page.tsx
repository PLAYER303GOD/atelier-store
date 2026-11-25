import type { Metadata } from "next";
import { Suspense, ViewTransition } from "react";

import { AddCategoryForm, CategoryRowActions } from "@/components/admin/category-manager";
import { AdminHeader, AdminSectionSkeleton } from "@/components/admin/admin-page";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { TextLink } from "@/components/ui/text-link";
import { listCategoriesWithCounts } from "@/lib/admin";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Categories — Admin — Atelier Store", robots: { index: false } };

/** Admin: categories. requireAdmin() inside <Suspense>; the category actions check again themselves. */
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
  const rows = await listCategoriesWithCounts();

  return (
    <>
      <AdminHeader title="Categories" intro="Each product belongs to one category, which has its own page in the store." />

      <section aria-labelledby="add-category-title" className="mb-12 border-b pb-12">
        <h2 id="add-category-title" className="mb-6 text-title">
          Add a category
        </h2>
        <AddCategoryForm />
      </section>

      <section aria-labelledby="categories-title">
        <h2 id="categories-title" className="mb-2 text-title">
          All categories
        </h2>
        <p className="mb-6 text-body-sm text-muted">A category can be deleted once no product uses it.</p>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[40rem] border-t text-left text-body-sm">
            <thead>
              <tr className="border-b text-label font-medium text-muted uppercase">
                <th scope="col" className="py-3 pr-4 font-medium">
                  Category
                </th>
                <th scope="col" className="py-3 pr-4 font-medium">
                  Page
                </th>
                <th scope="col" className="py-3 pr-4 text-right font-medium">
                  Products
                </th>
                <th scope="col" className="py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.slug} className="border-b align-top">
                  <td className="py-4 pr-4 text-body">{row.name}</td>
                  <td className="py-4 pr-4">
                    {row.products - row.hidden > 0 ? (
                      <TextLink href={`/${row.slug}`}>/{row.slug}</TextLink>
                    ) : (
                      <span className="text-muted">/{row.slug}</span>
                    )}
                  </td>
                  <td className="py-4 pr-4 text-right tabular-nums">
                    {row.products}
                    {row.hidden > 0 && <span className="block text-caption text-muted">{row.hidden} hidden</span>}
                  </td>
                  <td className="py-4">
                    <CategoryRowActions category={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
