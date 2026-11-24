import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, ViewTransition } from "react";

import { BagFeedback } from "@/components/cart/bag-feedback";
import { BagLineControls } from "@/components/cart/bag-line-controls";
import { ProductCard } from "@/components/product/product-card";
import { StockStatus } from "@/components/product/stock-status";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonStyles } from "@/components/ui/button";
import { MediaFrame } from "@/components/ui/media-frame";
import { ProductGrid } from "@/components/ui/product-grid";
import { SectionHeader } from "@/components/ui/section-header";
import { SmoothImage } from "@/components/ui/smooth-image";
import { TextLink } from "@/components/ui/text-link";
import { type BagLine, getBag } from "@/lib/cart";
import { formatPrice } from "@/lib/catalog";
import { getNewArrivals } from "@/lib/products";

export const metadata: Metadata = { title: "Shopping bag — Atelier Store", robots: { index: false } };

/**
 * The shopping bag. Heading in the static shell; the bag (cookie + session, live prices and
 * stock) is read inside <Suspense>, with the site's skeleton slide-down / content slide-up.
 */
export default function BagPage() {
  return (
    <div className="container-page pt-4 pb-section md:pt-6">
      <Breadcrumbs className="mb-6 md:mb-10" items={[{ label: "Home", href: "/" }, { label: "Shopping bag" }]} />
      <p className="mb-2 text-caption text-muted uppercase">Shopping bag</p>
      <h1 className="mb-8 text-display-sm md:mb-10">Your bag</h1>
      <Suspense
        fallback={
          <ViewTransition exit="slide-down" default="none">
            <BagSkeleton />
          </ViewTransition>
        }
      >
        <ViewTransition enter="slide-up" default="none">
          <BagFeedback>
            <BagContent />
          </BagFeedback>
        </ViewTransition>
      </Suspense>
    </div>
  );
}

async function BagContent() {
  const bag = await getBag();

  if (bag.lines.length === 0) {
    const suggestions = await getNewArrivals(4);
    return (
      <>
        <div className="flex flex-col items-center border-t pt-section pb-16 text-center md:pb-20">
          <p className="text-title">Your bag is empty</p>
          <p className="mt-3 max-w-sm text-body text-muted">Pieces you add will wait for you here.</p>
          <Link href="/new-in" className={`${buttonStyles({ variant: "secondary" })} mt-8`}>
            Shop new arrivals
          </Link>
        </div>
        <section aria-labelledby="bag-suggestions-title">
          <SectionHeader
            id="bag-suggestions-title"
            eyebrow="Just in"
            title="New arrivals"
            action={
              <TextLink href="/new-in" variant="cta">
                View all
              </TextLink>
            }
          />
          <ProductGrid layout="feature">
            {suggestions.map((product) => (
              <li key={product.slug}>
                <ProductCard product={product} />
              </li>
            ))}
          </ProductGrid>
        </section>
      </>
    );
  }

  const unavailable = bag.lines.filter((line) => line.status === "unavailable").length;
  const reduced = bag.lines.filter((line) => line.status === "reduced").length;

  return (
    <>
      {/* Above both columns, so the item list and the summary card start on the same line. */}
      <p className="mb-4 text-body-sm text-muted">
        {bag.itemCount} {bag.itemCount === 1 ? "piece" : "pieces"}
      </p>
      <div className="grid grid-cols-1 gap-y-10 lg:grid-cols-12 lg:gap-x-gutter">
        <section aria-labelledby="bag-items-title" className="min-w-0 lg:col-span-8">
          <h2 id="bag-items-title" className="sr-only">
            Items
          </h2>
          <ul role="list" className="border-t">
            {bag.lines.map((line) => (
              <BagLineItem key={line.slug} line={line} />
            ))}
          </ul>
        </section>

        <aside aria-labelledby="bag-summary-title" className="lg:col-span-4">
          <div className="border border-line p-6 transition-[top] duration-500 ease-out-soft md:p-8 lg:sticky lg:top-[calc(var(--header-offset)+2rem)]">
            <h2 id="bag-summary-title" className="mb-6 text-title">
              Summary
            </h2>
            <dl className="space-y-3 text-body-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(bag.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Shipping</dt>
                <dd>Complimentary</dd>
              </div>
            </dl>
            <div className="mt-6 flex items-baseline justify-between gap-4 border-t pt-6">
              <p className="text-label font-medium uppercase">Total</p>
              <p className="text-title tabular-nums" aria-live="polite">
                {formatPrice(bag.subtotalCents)}
              </p>
            </div>
            <p className="mt-2 text-body-sm text-muted">Taxes and delivery are confirmed at checkout.</p>
            {(unavailable > 0 || reduced > 0) && (
              <ul role="list" className="mt-6 space-y-2 border-l-2 border-warning bg-surface px-4 py-3 text-body-sm">
                {unavailable > 0 && (
                  <li>
                    {unavailable === 1 ? "1 piece is" : `${unavailable} pieces are`} no longer available and not included
                    in your total.
                  </li>
                )}
                {reduced > 0 && (
                  <li>
                    {reduced === 1 ? "1 quantity was" : `${reduced} quantities were`} reduced to what&rsquo;s in stock.
                  </li>
                )}
              </ul>
            )}
            <p className="mt-6 border-t pt-6 text-body-sm text-muted">Checkout is coming soon.</p>
            <TextLink href="/new-in" variant="cta" className="mt-6 inline-block">
              Continue shopping
            </TextLink>
          </div>
        </aside>
      </div>
    </>
  );
}

function BagLineItem({ line }: { line: BagLine }) {
  const unavailable = line.status === "unavailable";
  return (
    <li className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 border-b py-6 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-6">
      <Link href={`/products/${line.slug}`} tabIndex={-1} aria-hidden="true">
        <MediaFrame ratio="product" className={unavailable ? "opacity-50" : undefined}>
          <SmoothImage src={line.image.src} alt="" fill sizes="(min-width: 640px) 128px, 96px" className="object-cover" />
        </MediaFrame>
      </Link>

      <div className="flex min-w-0 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-caption text-muted uppercase">{line.category.name}</p>
            <h3 className="mt-1 text-body">
              <Link href={`/products/${line.slug}`} className="underline-offset-4 hover:underline">
                {line.name}
              </Link>
            </h3>
            <p className="mt-1 text-body-sm text-muted">
              {line.colour} · {formatPrice(line.unitPriceCents)}
              {line.quantity > 1 && " each"}
            </p>
          </div>
          <p className="shrink-0 text-body tabular-nums">{unavailable ? "—" : formatPrice(line.lineTotalCents)}</p>
        </div>

        <div className="mt-3">
          {unavailable ? (
            <p className="text-body-sm text-error">No longer available. Remove it to continue.</p>
          ) : line.status === "reduced" ? (
            <p className="text-body-sm text-warning">
              Only {line.available} left, so we&rsquo;ve reduced this to {line.quantity}.
            </p>
          ) : (
            <StockStatus stock={line.available} />
          )}
        </div>

        <div className="mt-auto pt-4">
          <BagLineControls
            slug={line.slug}
            name={line.name}
            quantity={line.quantity}
            available={line.available}
            unavailable={unavailable}
          />
        </div>
      </div>
    </li>
  );
}

function BagSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your bag" className="grid grid-cols-1 gap-y-10 lg:grid-cols-12 lg:gap-x-gutter">
      <div className="lg:col-span-8">
        <div className="mb-4 h-4 w-20 bg-surface" />
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="grid grid-cols-[6rem_1fr] gap-4 border-t py-6 sm:grid-cols-[8rem_1fr] sm:gap-6">
            <MediaFrame ratio="product" />
            <div className="space-y-3">
              <div className="h-3 w-20 bg-surface" />
              <div className="h-5 w-2/3 bg-surface" />
              <div className="h-4 w-1/3 bg-surface" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-72 border border-line lg:col-span-4" />
    </div>
  );
}
