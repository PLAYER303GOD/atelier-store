import type { Metadata } from "next";
import { Suspense, ViewTransition } from "react";

import { AdminComingNext, AdminHeader, AdminSectionSkeleton } from "@/components/admin/admin-page";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Stock — Admin — Atelier Store", robots: { index: false } };

/** Admin: stock. requireAdmin() inside <Suspense>: signed out → sign-in, not an admin → 404. */
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
  return (
    <>
      <AdminHeader title="Stock" intro="See available stock and adjust it." />
      <AdminComingNext>Stock adjustments arrive in a later step.</AdminComingNext>
    </>
  );
}
