import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, ViewTransition } from "react";

import { formatOrderDate, OrderLineList, OrderReference, OrderSummaryCard } from "@/components/order/order-details";
import { OrderStatus } from "@/components/order/order-status";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { MediaFrame } from "@/components/ui/media-frame";
import { TextLink } from "@/components/ui/text-link";
import { findOrderForUser } from "@/lib/order-store";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Order details — Atelier Store", robots: { index: false } };

const REFERENCE_PATTERN = /^AT-[2-9A-HJ-NP-Z]{8}$/;

/** What each history status means for the customer, under the heading. */
const statusNote = {
  paid: "Your payment is confirmed.",
  processing: "Your payment is still clearing. We’ll email you once it’s confirmed; there’s no need to pay again.",
  failed: "Your payment didn’t go through, so no charge was made.",
} as const;

/**
 * One order from the customer's history: /account/orders/view?order=AT-…. The reference comes
 * from the URL, but the order is only read for the signed-in user (findOrderForUser filters by
 * their id): anyone else's, or an unknown reference, is a 404. `searchParams` is awaited inside
 * <Suspense> (partialPrefetching).
 *
 * A query parameter, not an /orders/[reference] segment: references can't be listed in
 * generateStaticParams, and an unlisted dynamic param makes every usePathname() outside
 * <Suspense> (the site header, the account nav) suspend and fails the build.
 */
export default function OrderDetailPage({ searchParams }: PageProps<"/account/orders/view">) {
  return (
    <Suspense
      fallback={
        <ViewTransition exit="slide-down" default="none">
          <OrderSkeleton />
        </ViewTransition>
      }
    >
      <ViewTransition enter="slide-up" default="none">
        <OrderContent searchParams={searchParams} />
      </ViewTransition>
    </Suspense>
  );
}

async function OrderContent({ searchParams }: Pick<PageProps<"/account/orders/view">, "searchParams">) {
  const { order: reference } = await searchParams;
  if (typeof reference !== "string" || !REFERENCE_PATTERN.test(reference)) notFound();

  const user = await requireUser(`/account/orders/view?order=${reference}`);
  const order = await findOrderForUser(reference, user.id);
  if (!order || !(order.status in statusNote)) notFound();

  return (
    <>
      <Breadcrumbs
        className="mb-6 md:mb-10"
        items={[
          { label: "Home", href: "/" },
          { label: "My account", href: "/account" },
          { label: "Orders", href: "/account/orders" },
          { label: order.reference },
        ]}
      />
      <header className="mb-8 md:mb-10">
        <p className="mb-2 text-caption text-muted uppercase">
          Placed <time dateTime={order.createdAt.toISOString()}>{formatOrderDate(order.createdAt)}</time>
        </p>
        <h1 className="text-display-sm">
          Order <OrderReference>{order.reference}</OrderReference>
        </h1>
        <OrderStatus status={order.status} className="mt-3" />
        <p className="mt-2 text-body text-muted">{statusNote[order.status as keyof typeof statusNote]}</p>
      </header>

      <div className="grid grid-cols-1 gap-y-10 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-x-gutter">
        <OrderLineList lines={order.lines} />
        <OrderSummaryCard
          order={order}
          actions={
            <TextLink href="/account/orders" variant="cta" className="self-start">
              All orders
            </TextLink>
          }
        />
      </div>
    </>
  );
}

function OrderSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your order">
      <div className="mb-6 h-3 w-64 bg-surface md:mb-10" />
      <div className="mb-8 md:mb-10">
        <div className="mb-2 h-3 w-32 bg-surface" />
        <div className="h-9 w-72 bg-surface" />
        <div className="mt-3 h-4 w-24 bg-surface" />
      </div>
      <div className="grid grid-cols-1 gap-y-10 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-x-gutter">
        <div>
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="grid grid-cols-[6rem_1fr] gap-4 border-t py-6 sm:grid-cols-[8rem_1fr] sm:gap-6">
              <MediaFrame ratio="product" />
              <div className="space-y-3">
                <div className="h-5 w-2/3 bg-surface" />
                <div className="h-4 w-1/3 bg-surface" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-72 border border-line" />
      </div>
    </div>
  );
}
