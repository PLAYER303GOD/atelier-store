import Link from "next/link";
import type { ReactNode } from "react";

import { AddToBagButton } from "@/components/cart/add-to-bag-button";
import { ProductCard } from "@/components/product/product-card";
import { ProductGallery } from "@/components/product/product-gallery";
import { SaveButton } from "@/components/product/save-button";
import { StockStatus } from "@/components/product/stock-status";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Disclosure } from "@/components/ui/disclosure";
import { MediaFrame } from "@/components/ui/media-frame";
import { ProductGrid } from "@/components/ui/product-grid";
import { SectionHeader } from "@/components/ui/section-header";
import { categoryHref, formatPrice, type Product } from "@/lib/catalog";
import { services } from "@/lib/site";

/** Shared two-column frame so the page and its loading skeleton line up exactly. */
function DetailLayout({ gallery, info }: { gallery: ReactNode; info: ReactNode }) {
  return (
    <div className="grid gap-y-8 md:grid-cols-12 md:gap-x-gutter">
      <div className="md:col-span-7">{gallery}</div>
      <div className="md:col-span-5 xl:col-span-4 xl:col-start-9">
        {/* --header-offset drops to 0 while the header is tucked away; `top` glides with it. */}
        <div className="transition-[top] duration-500 ease-out-soft md:sticky md:top-[calc(var(--header-offset)+2rem)] md:pb-8">
          {info}
        </div>
      </div>
    </div>
  );
}

export function ProductDetail({ product, related }: { product: Product; related: Product[] }) {
  const soldOut = product.stock <= 0;

  return (
    <>
      <div className="container-page pt-4 md:pt-6">
        <Breadcrumbs
          className="mb-4 md:mb-6"
          items={[
            { label: "Home", href: "/" },
            { label: product.category.name, href: categoryHref(product.category.slug) },
            { label: product.name },
          ]}
        />

        <DetailLayout
          gallery={<ProductGallery product={product} />}
          info={
            <>
              <Link
                href={categoryHref(product.category.slug)}
                className="text-caption text-muted uppercase transition-colors hover:text-ink"
              >
                {product.category.name}
              </Link>
              <h1 className="mt-3 text-display-sm">{product.name}</h1>
              <p className="mt-4 text-body-lg tabular-nums">{formatPrice(product.priceCents)}</p>
              <StockStatus stock={product.stock} className="mt-2" />

              <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t pt-6 text-body-sm">
                <dt className="text-muted">Colour</dt>
                <dd>{product.colour}</dd>
                <dt className="text-muted">Delivery</dt>
                <dd>{soldOut ? "Unavailable" : "2–4 business days"}</dd>
              </dl>

              <AddToBagButton slug={product.slug} soldOut={soldOut} />
              {/* Available even when sold out — that's when saving matters most. */}
              <SaveButton slug={product.slug} name={product.name} className="mt-3" />

              <ul className="mt-4 space-y-1 text-caption text-muted uppercase">
                {services.slice(0, 3).map((service) => (
                  <li key={service.title}>{service.title}</li>
                ))}
              </ul>

              <p className="mt-10 text-body text-muted">{product.description}</p>

              <div className="mt-8 border-b">
                <Disclosure title="Product details" defaultOpen>
                  <ul className="space-y-1.5">
                    {product.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                </Disclosure>
                <Disclosure title="Shipping & returns">
                  <div className="space-y-3">
                    {services.slice(0, 2).map((service) => (
                      <p key={service.title}>{service.body}</p>
                    ))}
                  </div>
                </Disclosure>
              </div>
            </>
          }
        />
      </div>

      <section aria-labelledby="related-title" className="container-page py-section">
        <SectionHeader id="related-title" eyebrow="Discover more" title="You may also like" />
        <ProductGrid layout="feature">
          {related.map((item) => (
            <li key={item.slug}>
              <ProductCard product={item} />
            </li>
          ))}
        </ProductGrid>
      </section>
    </>
  );
}

/** Same geometry as ProductDetail, in the surface colour; no shimmer, matching the quiet design. */
export function ProductDetailSkeleton() {
  const bar = "bg-surface";
  return (
    <div className="container-page pt-4 md:pt-6" aria-busy="true" aria-label="Loading product">
      <div className={`mb-4 h-4 w-48 md:mb-6 ${bar}`} />
      <DetailLayout
        gallery={
          <div className="-mx-gutter md:mx-0">
            <MediaFrame ratio="product" />
          </div>
        }
        info={
          <div className="space-y-4">
            <div className={`h-3 w-20 ${bar}`} />
            <div className={`h-9 w-3/4 ${bar}`} />
            <div className={`h-5 w-24 ${bar}`} />
            <div className={`mt-8 h-12 w-full ${bar}`} />
          </div>
        }
      />
    </div>
  );
}
