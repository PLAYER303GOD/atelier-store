import type { NextRequest } from "next/server";

import { getProductsBySlugs } from "@/lib/products";

/** Saved items are far fewer than this; the cap just bounds the query. */
const MAX_SLUGS = 50;

/**
 * GET /api/products?slug=a&slug=b → Product[] in the order requested.
 * For the /saved page, where only the browser knows which products to show.
 */
export async function GET(request: NextRequest) {
  const slugs = [...new Set(request.nextUrl.searchParams.getAll("slug"))]
    .filter((slug) => /^[a-z0-9-]{1,100}$/.test(slug))
    .slice(0, MAX_SLUGS);
  return Response.json(await getProductsBySlugs(slugs));
}
