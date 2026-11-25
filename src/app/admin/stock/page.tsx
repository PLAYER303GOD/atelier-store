import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, ViewTransition } from "react";

import { AdminHeader, AdminSectionSkeleton } from "@/components/admin/admin-page";
import { StockAdjustInline } from "@/components/admin/stock-adjust";
import { StockStatus } from "@/components/product/stock-status";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { listAdminProducts } from "@/lib/admin";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Stock — Admin — Atelier Store", robots: { index: false } };

/** Admin: stock for every product, lowest first. requireAdmin() inside <Suspense>; adjustProductStock checks again. */
export default function AdminStockPage() {
  return (
    <>
      <Breadcrumbs className="mb-6 md:mb-10" items={[{ label: "Home", href: "/" }, { label: "Admin", href: "/admin" }, { label: "Stock" }]} />
      <Suspense
        fallback={
          <ViewTransition exit="slide-down" default="none">
            <AdminSectionSkeleton label="Loading stock" />
          </ViewTransition>
        }
      >
        <ViewTransition enter="slide-up" default="none">
          <StockContent />
        </ViewTransition>
      </Suspense>
    </>
  );
}

async function StockContent() {
  await requireAdmin("/admin/stock");
  const rows = (await listAdminProducts()).sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name));
  const out = rows.filter((row) => row.stock <= 0 && row.status === "active").length;
  const held = rows.reduce((sum, row) => sum + row.held, 0);

  return (
    <>
      <AdminHeader
        title="Stock"
        intro={`Lowest first. ${out} for sale ${out === 1 ? "is" : "are"} out of stock${held ? `; ${held} ${held === 1 ? "unit is" : "units are"} held in open checkouts` : ""}.`}
      />
      <p className="mb-6 max-w-2xl text-body-sm text-muted">
        Available is what can be sold now. Held units are reserved by customers who are paying; they come back automatically if
        the checkout isn&rsquo;t completed. Adjust by a change (+5 for a delivery, -1 for a damaged piece), never a total, so a
        checkout in progress can&rsquo;t be overwritten.
      </p>
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[46rem] border-t text-left text-body-sm">
          <thead>
            <tr className="border-b text-label font-medium text-muted uppercase">
              <th scope="col" className="py-3 pr-4 font-medium">
                Product
              </th>
              <th scope="col" className="py-3 pr-4 font-medium">
                Status
              </th>
              <th scope="col" className="py-3 pr-4 text-right font-medium">
                Available
              </th>
              <th scope="col" className="py-3 pr-4 text-right font-medium">
                Held
              </th>
              <th scope="col" className="py-3 font-medium">
                Adjust by
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.slug} className="border-b align-top">
                <td className="py-4 pr-4">
                  <Link href={`/admin/products/edit?product=${row.slug}`} className="text-body underline-offset-4 hover:underline">
                    {row.name}
                  </Link>
                  {row.status === "hidden" && <span className="block text-caption text-muted">Hidden</span>}
                </td>
                <td className="py-4 pr-4">
                  <StockStatus stock={row.stock} />
                </td>
                <td className="py-4 pr-4 text-right text-body tabular-nums">{row.stock}</td>
                <td className="py-4 pr-4 text-right tabular-nums text-muted">{row.held || "–"}</td>
                <td className="py-3">
                  <StockAdjustInline slug={row.slug} name={row.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
