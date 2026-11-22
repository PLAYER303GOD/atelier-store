import type { NextRequest } from "next/server";

import { normalizeSearchQuery } from "@/lib/catalog";
import { searchProducts } from "@/lib/products";

/** Enough to choose from in a dropdown; the full list is one Enter away on /search. */
const MAX_SUGGESTIONS = 6;

export type SearchSuggestion = {
  slug: string;
  name: string;
  category: string;
  priceCents: number;
  image: { src: string; alt: string };
};

/**
 * GET /api/search/suggestions?q=… → SearchSuggestion[] for the search box's typeahead.
 * Same matching and ranking as /search; queries under two characters return nothing.
 */
export async function GET(request: NextRequest) {
  const query = normalizeSearchQuery(request.nextUrl.searchParams.get("q"));
  if (query.length < 2) return Response.json([]);

  const products = await searchProducts(query);
  const suggestions: SearchSuggestion[] = products.slice(0, MAX_SUGGESTIONS).map((product) => ({
    slug: product.slug,
    name: product.name,
    category: product.category.name,
    priceCents: product.priceCents,
    image: product.images[0],
  }));
  return Response.json(suggestions);
}
