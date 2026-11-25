import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, ViewTransition } from "react";

import { AdminSectionSkeleton } from "@/components/admin/admin-page";
import { formatOrderDate, OrderLineList, OrderReference, OrderSummaryCard } from "@/components/order/order-details";
import { OrderStatus } from "@/components/order/order-status";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { TextLink } from "@/components/ui/text-link";
import { getAdminOrder } from "@/lib/admin";
import { formatPrice } from "@/lib/catalog";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Order — Admin — Atelier Store", robots: { index: false } };

const REFERENCE_PATTERN = /^AT-[2-9A-HJ-NP-Z]{8}$/;
const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

/**
 * Admin: one order, any customer, any status: /admin/orders/view?order=AT-… (query parameter; see
 * the admin layout). Read-only: payment state changes only through Stripe's webhook.
 */
export default function AdminOrderPage({ searchParams }: PageProps<"/admin/orders/view">) {
  return (
    <Suspense
      fallback={
        <ViewTransition exit="slide-down" default="none">
          <AdminSectionSkeleton label="Loading the order" />
        </ViewTransition>
      }
    >
      <ViewTransition enter="slide-up" default="none">
        <OrderContent searchParams={searchParams} />
      </ViewTransition>
    </Suspense>
  );
}

async function OrderContent({ searchParams }: Pick<PageProps<"/admin/orders/view">, "searchParams">) {
  const { order: reference } = await searchParams;
  await requireAdmin(`/admin/orders/view?order=${encodeURIComponent(String(reference ?? ""))}`);
  if (typeof reference !== "string" || !REFERENCE_PATTERN.test(reference)) notFound();
  const order = await getAdminOrder(reference);
  if (!order) notFound();

  // Four cells, two per row: an even grid never leaves an empty cell.
  const facts: { label: string; value: React.ReactNode }[] = [
    { label: "Customer", value: <>{order.customerName}<span className="block break-all text-muted">{order.customerEmail}</span></> },
    { label: "Placed", value: dateTime.format(order.createdAt) },
    {
      label: "Payment",
      value: order.paidAt ? (
        <>
          Paid {dateTime.format(order.paidAt)}
          {order.amountPaidCents !== null && <span className="block text-muted">{formatPrice(order.amountPaidCents)} received</span>}
        </>
      ) : order.status === "pending" ? (
        <>
          Not paid yet
          <span className="block text-muted">Checkout open until {dateTime.format(order.expiresAt)}</span>
        </>
      ) : (
        "Not paid"
      ),
    },
    {
      label: "Stripe",
      value: (
        <>
          <span className="block break-all">{order.stripePaymentIntentId ?? "No payment yet"}</span>
          <span className="block break-all text-muted">{order.stripeCheckoutSessionId ?? "No checkout session"}</span>
        </>
      ),
    },
  ];

  return (
    <>
      <Breadcrumbs
        className="mb-6 md:mb-10"
        items={[{ label: "Home", href: "/" }, { label: "Admin", href: "/admin" }, { label: "Orders", href: "/admin/orders" }, { label: order.reference }]}
      />
      <header className="mb-8 md:mb-10">
        <p className="mb-2 text-caption text-muted uppercase">
          Placed <time dateTime={order.createdAt.toISOString()}>{formatOrderDate(order.createdAt)}</time>
        </p>
        <h1 className="text-display-sm">
          Order <OrderReference>{order.reference}</OrderReference>
        </h1>
        <OrderStatus status={order.status} className="mt-3" />
      </header>

      <dl className="mb-10 grid gap-px border border-line bg-line sm:grid-cols-2">
        {facts.map((fact) => (
          <div key={fact.label} className="bg-paper p-5">
            <dt className="text-label font-medium text-muted uppercase">{fact.label}</dt>
            <dd className="mt-2 text-body-sm">{fact.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 gap-y-10 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-x-gutter">
        <OrderLineList lines={order.lines} />
        <OrderSummaryCard
          order={order}
          actions={
            <TextLink href="/admin/orders" variant="cta" className="self-start">
              All orders
            </TextLink>
          }
        />
      </div>
    </>
  );
}
