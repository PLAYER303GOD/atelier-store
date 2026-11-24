import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type ReactNode, Suspense, ViewTransition } from "react";

import { AwaitConfirmation } from "@/components/checkout/await-confirmation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonStyles } from "@/components/ui/button";
import { MediaFrame } from "@/components/ui/media-frame";
import { SmoothImage } from "@/components/ui/smooth-image";
import { TextLink } from "@/components/ui/text-link";
import { formatPrice } from "@/lib/catalog";
import { findOrderBySession, type OrderSummary } from "@/lib/order-store";
import { requireUser } from "@/lib/session";
import { getStripe, isMissingResource } from "@/lib/stripe";

export const metadata: Metadata = { title: "Your order — Atelier Store", robots: { index: false } };

const SESSION_ID_PATTERN = /^cs_[A-Za-z0-9_]{1,255}$/;

/**
 * Where Stripe sends the customer after paying. It only *reads*: reaching this page never marks an
 * order paid. The order's status comes from our database, which Stripe's webhook updates. While it
 * is still pending, Stripe is asked (server side) only to choose the wording: "confirming" if the
 * payment page was completed, or "not complete" with a way back to it.
 */
export default function CheckoutSuccessPage({ searchParams }: PageProps<"/checkout/success">) {
  return (
    <div className="container-page pt-4 pb-section md:pt-6">
      <Breadcrumbs
        className="mb-6 md:mb-10"
        items={[{ label: "Home", href: "/" }, { label: "Shopping bag", href: "/bag" }, { label: "Your order" }]}
      />
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
    </div>
  );
}

type View = { eyebrow: string; title: string; intro: ReactNode; actions: ReactNode; waiting?: boolean };

async function OrderContent({ searchParams }: Pick<PageProps<"/checkout/success">, "searchParams">) {
  const { session_id: sessionId } = await searchParams;
  if (typeof sessionId !== "string" || !SESSION_ID_PATTERN.test(sessionId)) notFound();

  const user = await requireUser(`/checkout/success?session_id=${sessionId}`);
  const order = await findOrderBySession(sessionId, user.id);
  if (!order) notFound(); // unknown, or someone else's

  const view = await viewFor(order, sessionId, user.email);

  return (
    <>
      <header className="mb-8 md:mb-10">
        <p className="mb-2 text-caption text-muted uppercase">{view.eyebrow}</p>
        <h1 className="text-display-sm">{view.title}</h1>
        <p className="mt-2 max-w-prose text-body text-muted">{view.intro}</p>
        {view.waiting && <AwaitConfirmation />}
      </header>

      <div className="grid grid-cols-1 gap-y-10 lg:grid-cols-12 lg:gap-x-gutter">
        <section aria-labelledby="order-items-title" className="min-w-0 lg:col-span-8">
          <h2 id="order-items-title" className="sr-only">
            Items
          </h2>
          <ul role="list" className="border-t">
            {order.lines.map((line) => (
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
                      <Link href={`/products/${line.slug}`} className="underline-offset-4 hover:underline">
                        {line.name}
                      </Link>
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

        <aside aria-labelledby="order-summary-title" className="lg:col-span-4">
          <div className="border border-line p-6 md:p-8">
            <h2 id="order-summary-title" className="mb-6 text-title">
              Summary
            </h2>
            <dl className="space-y-3 text-body-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Order</dt>
                <dd className="tabular-nums">{order.reference}</dd>
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
            {order.shipping && (
              <div className="mt-6 border-t pt-6 text-body-sm">
                <p className="mb-2 text-label font-medium uppercase">Delivering to</p>
                <address className="text-muted not-italic">
                  {order.shipping.name}
                  <br />
                  {order.shipping.address.line1}
                  {order.shipping.address.line2 && (
                    <>
                      <br />
                      {order.shipping.address.line2}
                    </>
                  )}
                  <br />
                  {order.shipping.address.city}
                  {order.shipping.address.state && `, ${order.shipping.address.state}`} {order.shipping.address.postalCode}
                </address>
              </div>
            )}
            <div className="mt-6 flex flex-col gap-4">{view.actions}</div>
          </div>
        </aside>
      </div>
    </>
  );
}

/** Heading, intro and next step for each order status. Never writes anything. */
async function viewFor(order: OrderSummary, sessionId: string, email: string): Promise<View> {
  const continueShopping = (
    <TextLink href="/new-in" variant="cta" className="self-start">
      Continue shopping
    </TextLink>
  );
  const backToBag = (
    <Link href="/bag" className={buttonStyles({ variant: "secondary", fullWidth: true })}>
      Return to bag
    </Link>
  );
  const closed: View = {
    eyebrow: "Checkout closed",
    title: "This checkout is no longer open",
    intro: "No charge was made. Your bag is saved, so you can check out again whenever you're ready.",
    actions: backToBag,
  };

  switch (order.status) {
    case "paid":
      return {
        eyebrow: "Order confirmed",
        title: "Thank you for your order",
        intro: `Order ${order.reference} is confirmed. A receipt is on its way to ${email}.`,
        actions: continueShopping,
      };
    case "processing":
      return {
        eyebrow: "Payment processing",
        title: "Your payment is processing",
        intro: `We've reserved your pieces and will confirm order ${order.reference} by email as soon as your payment clears.`,
        actions: continueShopping,
      };
    case "failed":
      return {
        eyebrow: "Payment unsuccessful",
        title: "Your payment didn't go through",
        intro: "No charge was made. Your bag is saved, so you can try again whenever you're ready.",
        actions: backToBag,
      };
    case "expired":
    case "canceled":
      return closed;
    case "pending":
      break;
  }

  // Pending: Stripe hasn't told us yet. Ask it what happened, for the wording only.
  let session: { status: string | null; url: string | null } | undefined;
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId);
  } catch (error) {
    if (isMissingResource(error)) {
      // Not in our Stripe account (made with another account's key): no payment for it can reach
      // us. The order is released the next time this customer starts checkout.
      console.warn(`Checkout Session for ${order.reference} is unknown to this Stripe account`);
      return closed;
    }
    console.error("Retrieving the Checkout Session for the success page failed", error);
  }

  if (session?.status === "open" && session.url) {
    return {
      eyebrow: "Checkout",
      title: "Your payment isn't complete",
      intro: "Your pieces are reserved for a little longer. Return to payment to finish your order.",
      actions: (
        <>
          <a href={session.url} className={buttonStyles({ fullWidth: true })}>
            Return to payment
          </a>
          {backToBag}
        </>
      ),
    };
  }

  return {
    eyebrow: "Confirming payment",
    title: "Thank you, we're confirming your payment",
    intro: `This usually takes a few seconds. We'll email ${email} when order ${order.reference} is confirmed.`,
    actions: continueShopping,
    waiting: true,
  };
}

function OrderSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your order">
      <div className="mb-8 md:mb-10">
        <div className="mb-2 h-3 w-24 bg-surface" />
        <div className="h-9 w-72 bg-surface" />
        <div className="mt-2 h-4 w-80 max-w-full bg-surface" />
      </div>
      <div className="grid grid-cols-1 gap-y-10 lg:grid-cols-12 lg:gap-x-gutter">
        <div className="lg:col-span-8">
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
        <div className="h-72 border border-line lg:col-span-4" />
      </div>
    </div>
  );
}
