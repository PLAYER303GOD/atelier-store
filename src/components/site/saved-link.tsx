"use client";

import Link from "next/link";

import { HeartIcon } from "@/components/icons";
import { buttonStyles } from "@/components/ui/button";
import { useSavedItems } from "@/lib/saved-items";

/** Header heart with a count of saved items. */
export function SavedLink() {
  const count = useSavedItems()?.length ?? 0;
  return (
    <Link
      href="/saved"
      aria-label={count ? `Saved items, ${count}` : "Saved items"}
      className={`${buttonStyles({ variant: "ghost", size: "icon" })} relative`}
    >
      <HeartIcon />
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
