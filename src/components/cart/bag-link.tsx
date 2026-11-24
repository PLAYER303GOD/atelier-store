import Link from "next/link";

import { BagIcon } from "@/components/icons";
import { buttonStyles } from "@/components/ui/button";
import { getBagCount } from "@/lib/cart";

/** Header bag icon with an item count (same badge as the saved-items heart). */
export function BagLinkView({ count }: { count: number }) {
  return (
    <Link
      href="/bag"
      aria-label={count ? `Shopping bag, ${count} ${count === 1 ? "item" : "items"}` : "Shopping bag"}
      className={`${buttonStyles({ variant: "ghost", size: "icon" })} relative`}
    >
      <BagIcon />
      {count > 0 && (
        <span
          key={count}
          aria-hidden="true"
          className="absolute top-1.5 right-1 flex h-4 min-w-4 animate-pop items-center justify-center rounded-full bg-ink px-1 text-[0.625rem] leading-none font-medium text-paper tabular-nums ring-1 ring-paper"
        >
          {count}
        </span>
      )}
    </Link>
  );
}

/**
 * Reads the bag (cookie + session) at request time, so the header renders it inside a small
 * <Suspense> with <BagLinkView count={0} /> as the fallback: the rest of the header stays in the
 * static shell. Bag actions call refresh(), which re-renders this with the new count.
 */
export async function BagLink() {
  return <BagLinkView count={await getBagCount()} />;
}
