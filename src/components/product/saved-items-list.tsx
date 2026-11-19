"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProductCard } from "@/components/product/product-card";
import { buttonStyles } from "@/components/ui/button";
import { MediaFrame } from "@/components/ui/media-frame";
import { ProductGrid } from "@/components/ui/product-grid";
import type { Product } from "@/lib/catalog";
import { useSavedItems } from "@/lib/saved-items";

/** Product per saved slug; `null` once the database has confirmed the slug doesn't exist. */
type Loaded = Record<string, Product | null>;

async function fetchProducts(slugs: string[]): Promise<Product[]> {
  const query = new URLSearchParams(slugs.map((slug) => ["slug", slug]));
  const response = await fetch(`/api/products?${query}`);
  if (!response.ok) throw new Error(`Failed to load saved items (${response.status})`);
  return response.json();
}

export function SavedItemsList() {
  const slugs = useSavedItems();
  const [loaded, setLoaded] = useState<Loaded>({});

  // Fetch only slugs not loaded yet, so un-saving an item doesn't refetch the rest.
  const missing = slugs?.filter((slug) => !(slug in loaded)) ?? [];
  const missingKey = missing.join(",");
  useEffect(() => {
    if (!missingKey) return;
    const requested = missingKey.split(",");
    let cancelled = false;
    fetchProducts(requested)
      .then((found) => {
        if (cancelled) return;
        const bySlug = new Map(found.map((p) => [p.slug, p]));
        setLoaded((prev) => ({
          ...prev,
          ...Object.fromEntries(requested.map((slug) => [slug, bySlug.get(slug) ?? null])),
        }));
      })
      .catch((error) => console.error(error));
    return () => {
      cancelled = true;
    };
  }, [missingKey]);

  // Not read from this browser or the catalogue yet: neutral placeholders.
  if (slugs === null || missing.length > 0) {
    return (
      <ProductGrid aria-busy="true" aria-label="Loading saved items">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i}>
            <MediaFrame ratio="product" />
            <div className="mt-4 h-3 w-2/3 bg-surface" />
          </li>
        ))}
      </ProductGrid>
    );
  }

  // Ignore slugs that no longer exist in the catalogue.
  const products = slugs.flatMap((slug) => loaded[slug] ?? []);

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center border-t py-section text-center">
        <p className="text-title">Nothing saved yet</p>
        <p className="mt-3 max-w-sm text-body text-muted">
          Tap the heart on any piece to keep it here for later.
        </p>
        <Link href="/" className={`${buttonStyles({ variant: "secondary" })} mt-8`}>
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <>
      <p aria-live="polite" className="mb-6 text-body-sm text-muted">
        {products.length} {products.length === 1 ? "item" : "items"}
      </p>
      <ProductGrid>
        {products.map((product) => (
          <li key={product.slug}>
            <ProductCard product={product} />
          </li>
        ))}
      </ProductGrid>
    </>
  );
}
