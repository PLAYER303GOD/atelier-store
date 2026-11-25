import Link from "next/link";
import type { ReactNode } from "react";

import { MediaFrame } from "@/components/ui/media-frame";
import { SmoothImage } from "@/components/ui/smooth-image";
import { formatPrice } from "@/lib/catalog";
import type { OrderSummary } from "@/lib/order-store";

const longDate = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });

/** "November 24, 2026". */
export const formatOrderDate = (date: Date) => longDate.format(date);

/** An order reference that never wraps at its hyphen (customers quote it). */
export function OrderReference({ children }: { children: string }) {
  return <span className="whitespace-nowrap">{children}</span>;
}

/** The order's lines as bought: snapshot name, colour, unit price and quantity. Same rhythm as bag lines. */
export function OrderLineList({ lines }: { lines: OrderSummary["lines"] }) {
  return (
    <section aria-labelledby="order-items-title" className="min-w-0">
      <h2 id="order-items-title" className="sr-only">
        Items
      </h2>
      <ul role="list" className="border-t">
        {lines.map((line) => (
          <li
            key={line.slug}
            className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 border-b py-6 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-6"
          >
            <MediaFrame ratio="product">
              <SmoothImage src={line.image.src} alt="" fill sizes="(min-width: 640px) 128px, 96px" className="object-cover" />
            </MediaFrame>
            <div className="flex min-w-0 items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-body">
                  {line.isPublic ? (
                    <Link href={`/products/${line.slug}`} className="underline-offset-4 hover:underline">
                      {line.name}
                    </Link>
                  ) : (
                    // No longer in the store: the name as bought, without a link to a 404.
                    line.name
                  )}
                </h3>
                <p className="mt-1 text-body-sm text-muted">
                  {line.colour} · {formatPrice(line.unitPriceCents)}
                  {line.quantity > 1 && " each"}
                </p>
                <p className="mt-1 text-body-sm text-muted">Quantity {line.quantity}</p>
              </div>
              <p className="shrink-0 text-body tabular-nums">{formatPrice(line.unitPriceCents * line.quantity)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Bordered summary card: reference, totals, delivery address, then any actions. Same card as the bag's. */
export function OrderSummaryCard({
  order,
  actions,
  className,
}: {
  order: OrderSummary;
  actions?: ReactNode;
  className?: string;
}) {
  const address = order.shipping?.address;
  return (
    <aside aria-labelledby="order-summary-title" className={className}>
      <div className="border border-line p-6 md:p-8">
        <h2 id="order-summary-title" className="mb-6 text-title">
          Summary
        </h2>
        <dl className="space-y-3 text-body-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Order</dt>
            <dd className="tabular-nums">
              <OrderReference>{order.reference}</OrderReference>
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums">{formatPrice(order.totalCents)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Shipping</dt>
            <dd>Complimentary</dd>
          </div>
        </dl>
        <div className="mt-6 flex items-baseline justify-between gap-4 border-t pt-6">
          <p className="text-label font-medium uppercase">Total</p>
          <p className="text-title tabular-nums">{formatPrice(order.totalCents)}</p>
        </div>
        {order.shipping && address && (
          <div className="mt-6 border-t pt-6 text-body-sm">
            <p className="mb-2 text-label font-medium uppercase">Delivering to</p>
            <address className="text-muted not-italic">
              {order.shipping.name}
              <br />
              {address.line1}
              {address.line2 && (
                <>
                  <br />
                  {address.line2}
                </>
              )}
              <br />
              {address.city}
              {address.state && `, ${address.state}`} {address.postalCode}
            </address>
          </div>
        )}
        {actions && <div className="mt-6 flex flex-col gap-4">{actions}</div>}
      </div>
    </aside>
  );
}
