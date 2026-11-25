import type { Metadata } from "next";
import { Suspense, ViewTransition } from "react";

import { AdminComingNext, AdminHeader, AdminSectionSkeleton } from "@/components/admin/admin-page";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Orders — Admin — Atelier Store", robots: { index: false } };

/** Admin: orders. requireAdmin() inside <Suspense>: signed out → sign-in, not an admin → 404. */
export default function AdminOrdersPage() {
  return (
    <>
      <Breadcrumbs className="mb-6 md:mb-10" items={[{ label: "Home", href: "/" }, { label: "Admin", href: "/admin" }, { label: "Orders" }]} />
      <Suspense
        fallback={
          <ViewTransition exit="slide-down" default="none">
            <AdminSectionSkeleton label="Loading orders" />
          </ViewTransition>
        }
      >
        <ViewTransition enter="slide-up" default="none">
          <OrdersContent />
        </ViewTransition>
      </Suspense>
    </>
  );
}

async function OrdersContent() {
  await requireAdmin("/admin/orders");
  return (
    <>
      <AdminHeader title="Orders" intro="Every order placed in the store." />
      <AdminComingNext>The order list arrives in a later step.</AdminComingNext>
    </>
  );
}
