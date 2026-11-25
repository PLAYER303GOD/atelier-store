import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, ViewTransition } from "react";

import { AdminHeader, AdminSectionSkeleton } from "@/components/admin/admin-page";
import { formatOrderDate, OrderReference } from "@/components/order/order-details";
import { OrderStatus } from "@/components/order/order-status";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ORDER_STATUSES, type OrderStatus as Status } from "@/db/order-schema";
import { ADMIN_ORDER_LIMIT, countOrdersByStatus, listAllOrders } from "@/lib/admin";
import { formatPrice } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Orders — Admin — Atelier Store", robots: { index: false } };

const FILTER_LABELS: Record<Status, string> = {
  paid: "Paid",
  processing: "Processing",
  pending: "Awaiting payment",
  failed: "Failed",
  expired: "Expired",
  canceled: "Cancelled",
};

/** Admin: every customer's orders, newest first, filterable by status (?status=). Read-only. */
export default function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
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
          <OrdersContent searchParams={searchParams} />
        </ViewTransition>
      </Suspense>
    </>
  );
}

async function OrdersContent({ searchParams }: Pick<PageProps<"/admin/orders">, "searchParams">) {
  await requireAdmin("/admin/orders");
  const { status: raw } = await searchParams;
  const status = ORDER_STATUSES.includes(raw as Status) ? (raw as Status) : undefined;
  const [rows, counts] = await Promise.all([listAllOrders(status), countOrdersByStatus()]);
  const total = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);
  const filters: { label: string; status?: Status; count: number }[] = [
    { label: "All", count: total },
    ...ORDER_STATUSES.map((s) => ({ label: FILTER_LABELS[s], status: s, count: counts[s] ?? 0 })),
  ];

  return (
    <>
      <AdminHeader
        title="Orders"
        intro={`Newest first${rows.length === ADMIN_ORDER_LIMIT ? `, the latest ${ADMIN_ORDER_LIMIT}` : ""}. Only paid orders are confirmed by Stripe.`}
      />

      <nav aria-label="Filter orders by status" className="mb-6">
        <ul role="list" className="no-scrollbar -mx-gutter flex gap-6 overflow-x-auto border-b px-gutter md:mx-0 md:px-0">
          {filters.map((filter) => {
            const current = filter.status === status;
            return (
              <li key={filter.label} className="shrink-0">
                <Link
                  href={filter.status ? `/admin/orders?status=${filter.status}` : "/admin/orders"}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "-mb-px block border-b py-3 text-label font-medium whitespace-nowrap uppercase transition-colors duration-200",
                    current ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink",
                  )}
                >
                  {filter.label} <span className="tabular-nums text-subtle">{filter.count}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {rows.length === 0 ? (
        <p className="py-8 text-body text-muted">No orders {status ? `with this status` : "yet"}.</p>
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[48rem] text-left text-body-sm">
            <thead>
              <tr className="border-b text-label font-medium text-muted uppercase">
                <th scope="col" className="py-3 pr-4 font-medium">
                  Order
                </th>
                <th scope="col" className="py-3 pr-4 font-medium">
                  Date
                </th>
                <th scope="col" className="py-3 pr-4 font-medium">
                  Customer
                </th>
                <th scope="col" className="py-3 pr-4 font-medium">
                  Status
                </th>
                <th scope="col" className="py-3 pr-4 text-right font-medium">
                  Pieces
                </th>
                <th scope="col" className="py-3 text-right font-medium">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.reference} className="border-b">
                  <td className="py-3 pr-4">
                    <Link
                      href={`/admin/orders/view?order=${row.reference}`}
                      className="text-body underline underline-offset-4 hover:decoration-transparent"
                    >
                      <OrderReference>{row.reference}</OrderReference>
                    </Link>
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap text-muted">
                    <time dateTime={row.createdAt.toISOString()}>{formatOrderDate(row.createdAt)}</time>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="block">{row.customerName}</span>
                    <span className="block text-caption break-all text-muted">{row.customerEmail}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <OrderStatus status={row.status} />
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">{row.itemCount}</td>
                  <td className="py-3 text-right tabular-nums">{formatPrice(row.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
