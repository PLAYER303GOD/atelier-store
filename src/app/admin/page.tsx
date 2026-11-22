import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { StockStatus } from "@/components/product/stock-status";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getStockOverview } from "@/lib/products";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Admin — Atelier Store", robots: { index: false } };

/**
 * Admin overview (read-only). requireAdmin(): signed out → sign-in, not an admin → 404.
 * Any admin write added later (Server Action / route handler) must call requireAdmin() itself.
 */
export default function AdminPage() {
  return (
    <div className="container-page pt-4 pb-section md:pt-6">
      <Suspense fallback={<AdminSkeleton />}>
        <AdminContent />
      </Suspense>
    </div>
  );
}

async function AdminContent() {
  const admin = await requireAdmin();
  const overview = await getStockOverview();
  const stats = [
    { label: "Products", value: overview.products },
    { label: "Categories", value: overview.categories },
    { label: "Collections", value: overview.collections },
    { label: "Out of stock", value: overview.outOfStock },
  ];

  return (
    <>
      <Breadcrumbs
        className="mb-6 md:mb-10"
        items={[{ label: "Home", href: "/" }, { label: "My account", href: "/account" }, { label: "Admin" }]}
      />
      <p className="mb-2 text-caption text-muted uppercase">Admin</p>
      <h1 className="mb-2 text-display-sm">Catalogue overview</h1>
      <p className="mb-8 text-body text-muted md:mb-10">Signed in as {admin.email}.</p>

      <dl className="grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-paper p-5 md:p-6">
            <dt className="text-label font-medium text-muted uppercase">{stat.label}</dt>
            <dd className="mt-2 text-display-sm tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="stock-alerts-title" className="mt-section">
        <h2 id="stock-alerts-title" className="mb-2 text-title">
          Stock alerts
        </h2>
        <p className="mb-6 text-body-sm text-muted">Out of stock or 3 or fewer left, lowest first.</p>
        {overview.alerts.length === 0 ? (
          <p className="border-t py-6 text-body text-muted">Everything is well stocked.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] border-t text-left text-body-sm">
              <thead>
                <tr className="border-b text-label font-medium text-muted uppercase">
                  <th scope="col" className="py-3 pr-4 font-medium">Product</th>
                  <th scope="col" className="py-3 pr-4 font-medium">Category</th>
                  <th scope="col" className="py-3 pr-4 text-right font-medium">Stock</th>
                  <th scope="col" className="py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {overview.alerts.map((product) => (
                  <tr key={product.slug} className="border-b">
                    <td className="py-3 pr-4">
                      <Link href={`/products/${product.slug}`} className="underline-offset-4 hover:underline">
                        {product.name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-muted">{product.category.name}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{product.stock}</td>
                    <td className="py-3">
                      <StockStatus stock={product.stock} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function AdminSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading admin overview">
      <div className="mb-6 h-4 w-48 bg-surface md:mb-10" />
      <div className="mb-2 h-3 w-16 bg-surface" />
      <div className="mb-8 h-9 w-72 bg-surface md:mb-10" />
      <div className="grid grid-cols-2 gap-px bg-line md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 bg-surface" />
        ))}
      </div>
    </div>
  );
}
