import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, ViewTransition } from "react";

import { AccountHeader } from "@/components/account/account-card";
import { formatOrderDate, OrderReference } from "@/components/order/order-details";
import { OrderStatus } from "@/components/order/order-status";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonStyles } from "@/components/ui/button";
import { MediaFrame } from "@/components/ui/media-frame";
import { SmoothImage } from "@/components/ui/smooth-image";
import { TextLink } from "@/components/ui/text-link";
import { formatPrice } from "@/lib/catalog";
import { listOrdersForUser } from "@/lib/order-store";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Orders — Atelier Store", robots: { index: false } };

/**
 * Order history. requireUser() (fresh session read) runs inside <Suspense>, and only that user's
 * orders are read (listOrdersForUser filters by their id on the server). Newest first.
 */
export default function OrdersPage() {
  return (
    <>
      <Breadcrumbs
        className="mb-6 md:mb-10"
        items={[{ label: "Home", href: "/" }, { label: "My account", href: "/account" }, { label: "Orders" }]}
      />
      <Suspense
        fallback={
          <ViewTransition exit="slide-down" default="none">
            <OrdersSkeleton />
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
  const user = await requireUser("/account/orders");
  const orders = await listOrdersForUser(user.id);

  if (orders.length === 0) {
    return (
      <>
        <AccountHeader eyebrow="My account" title="Orders" />
        <div className="flex flex-col items-center border-t pt-section pb-16 text-center">
          <p className="text-title">No orders yet</p>
          <p className="mt-3 max-w-sm text-body text-muted">Once you place an order, you&rsquo;ll find it here.</p>
          <Link href="/new-in" className={`${buttonStyles({ variant: "secondary" })} mt-8`}>
            Shop new arrivals
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <AccountHeader
        eyebrow="My account"
        title="Orders"
        intro={`${orders.length} ${orders.length === 1 ? "order" : "orders"}, most recent first.`}
      />
      <ul role="list" className="border-t">
        {orders.map((order) => (
          <li
            key={order.reference}
            className="grid grid-cols-[4rem_minmax(0,1fr)] gap-4 border-b py-6 sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-6"
          >
            <MediaFrame ratio="product">
              {order.image && (
                <SmoothImage src={order.image.src} alt="" fill sizes="(min-width: 640px) 80px, 64px" className="object-cover" />
              )}
            </MediaFrame>
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-body">
                  Order <OrderReference>{order.reference}</OrderReference>
                </h2>
                <p className="mt-1 text-body-sm text-muted">
                  <time dateTime={order.createdAt.toISOString()}>{formatOrderDate(order.createdAt)}</time> ·{" "}
                  {order.itemCount} {order.itemCount === 1 ? "piece" : "pieces"}
                </p>
                <OrderStatus status={order.status} className="mt-2" />
              </div>
              <div className="flex items-baseline justify-between gap-6 sm:flex-col sm:items-end sm:gap-3">
                <p className="text-body tabular-nums">
                  <span className="sr-only">Total </span>
                  {formatPrice(order.totalCents)}
                </p>
                <TextLink href={`/account/orders/view?order=${order.reference}`} variant="cta">
                  View order<span className="sr-only"> {order.reference}</span>
                </TextLink>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function OrdersSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your orders">
      <div className="mb-8 md:mb-10">
        <div className="mb-2 h-3 w-24 bg-surface" />
        <div className="h-9 w-40 bg-surface" />
        <div className="mt-2 h-4 w-56 bg-surface" />
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="grid grid-cols-[4rem_1fr] gap-4 border-t py-6 sm:grid-cols-[5rem_1fr] sm:gap-6">
          <MediaFrame ratio="product" />
          <div className="space-y-3">
            <div className="h-5 w-48 bg-surface" />
            <div className="h-4 w-40 bg-surface" />
            <div className="h-4 w-24 bg-surface" />
          </div>
        </div>
      ))}
    </div>
  );
}
