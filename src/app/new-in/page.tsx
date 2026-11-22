import type { Metadata } from "next";

import { ProductListing } from "@/components/product/product-listing";
import { getNewArrivals } from "@/lib/products";

export const metadata: Metadata = {
  title: "New arrivals — Atelier Store",
  description: "The latest pieces to arrive at the atelier, newest first.",
};

/** How many of the latest products the page lists. */
const NEW_IN_LIMIT = 24;

export default async function NewInPage() {
  return (
    <ProductListing
      crumb="New in"
      eyebrow="Just in"
      title="New arrivals"
      note="newest first"
      products={await getNewArrivals(NEW_IN_LIMIT)}
      empty={{ title: "Nothing new just yet", body: "New pieces arrive every season. Check back soon." }}
    />
  );
}
