import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type ReactNode, Suspense, ViewTransition } from "react";

import { AwaitConfirmation } from "@/components/checkout/await-confirmation";
import { OrderLineList, OrderReference, OrderSummaryCard } from "@/components/order/order-details";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonStyles } from "@/components/ui/button";
import { MediaFrame } from "@/components/ui/media-frame";
import { TextLink } from "@/components/ui/text-link";
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
        <div className="min-w-0 lg:col-span-8">
          <OrderLineList lines={order.lines} />
        </div>
        <OrderSummaryCard order={order} actions={view.actions} className="lg:col-span-4" />
      </div>
    </>
  );
}

/** Heading, intro and next step for each order status. Never writes anything. */
async function viewFor(order: OrderSummary, sessionId: string, email: string): Promise<View> {
  const reference = <OrderReference>{order.reference}</OrderReference>;
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
        intro: (
          <>
            Order {reference} is confirmed. A receipt is on its way to {email}.
          </>
        ),
        actions: continueShopping,
      };
    case "processing":
      return {
        eyebrow: "Payment processing",
        title: "Your payment is processing",
        intro: (
          <>
            We&rsquo;ve reserved your pieces and will confirm order {reference} by email as soon as your payment clears.
          </>
        ),
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
      // Not in our Stripe account (e.g. made with another account's key), so we can't see whether
      // it was paid. Say exactly that: never "no charge", and never invite paying again.
      console.warn(`Checkout Session for ${order.reference} is unknown to this Stripe account`);
      return {
        eyebrow: "Payment status unknown",
        title: "We can't confirm this payment yet",
        intro: (
          <>
            We couldn&rsquo;t look up the payment for order {reference}, so we can&rsquo;t tell whether you were charged.
            Please don&rsquo;t pay again. If a charge appears on your statement, contact us with your order number and
            we&rsquo;ll reconcile it.
          </>
        ),
        actions: (
          <TextLink href="/client-services" variant="cta" className="self-start">
            Contact us
          </TextLink>
        ),
      };
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
    intro: (
      <>
        This usually takes a few seconds. We&rsquo;ll email {email} when order {reference} is confirmed.
      </>
    ),
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
