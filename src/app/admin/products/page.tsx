import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, ViewTransition } from "react";

import { AdminHeader, AdminSectionSkeleton } from "@/components/admin/admin-page";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonStyles } from "@/components/ui/button";
import { MediaFrame } from "@/components/ui/media-frame";
import { SmoothImage } from "@/components/ui/smooth-image";
import { formatPrice } from "@/lib/catalog";
import { listAdminProducts } from "@/lib/admin";
import { cn } from "@/lib/cn";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Products — Admin — Atelier Store", robots: { index: false } };

/** Admin: every product, hidden ones included. requireAdmin() inside <Suspense>: signed out → sign-in, not an admin → 404. */
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
  const rows = await listAdminProducts();
  const hidden = rows.filter((row) => row.status === "hidden").length;

  return (
    <>
      <AdminHeader
        title="Products"
        intro={`${rows.length} products${hidden ? `, ${hidden} hidden` : ""}. Newest first.`}
        action={
          <Link href="/admin/products/new" className={buttonStyles({ size: "sm" })}>
            New product
          </Link>
        }
      />
      {/* relative: the table's sr-only labels are position:absolute, so without a positioned
          scroll container they'd widen the whole page on phones instead of scrolling. */}
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[44rem] border-t text-left text-body-sm">
          <thead>
            <tr className="border-b text-label font-medium text-muted uppercase">
              <th scope="col" className="py-3 pr-4 font-medium">
                Product
              </th>
              <th scope="col" className="py-3 pr-4 font-medium">
                Category
              </th>
              <th scope="col" className="py-3 pr-4 text-right font-medium">
                Price
              </th>
              <th scope="col" className="py-3 pr-4 text-right font-medium">
                Stock
              </th>
              <th scope="col" className="py-3 pr-4 font-medium">
                Availability
              </th>
              <th scope="col" className="py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.slug} className="border-b">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-4">
                    <MediaFrame ratio="product" className="w-12 shrink-0">
                      <SmoothImage src={row.image.src} alt="" fill sizes="48px" className="object-cover" />
                    </MediaFrame>
                    <div className="min-w-0">
                      <p className="text-body">{row.name}</p>
                      <p className="text-caption text-muted">{row.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4 text-muted">{row.category}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{formatPrice(row.priceCents)}</td>
                <td className="py-3 pr-4 text-right tabular-nums">
                  {row.stock}
                  {row.held > 0 && <span className="block text-caption text-muted">{row.held} held</span>}
                </td>
                <td className="py-3 pr-4">
                  <p className={cn("flex items-center gap-2", row.status === "hidden" ? "text-muted" : "text-ink")}>
                    <span aria-hidden="true" className={cn("size-1.5 rounded-full", row.status === "hidden" ? "bg-subtle" : "bg-success")} />
                    {row.status === "hidden" ? "Hidden" : "Available"}
                  </p>
                </td>
                <td className="py-3 text-right">
                  <Link
                    href={`/admin/products/edit?product=${row.slug}`}
                    className="text-label font-medium whitespace-nowrap uppercase underline underline-offset-4 hover:decoration-transparent"
                  >
                    Edit<span className="sr-only"> {row.name}</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
