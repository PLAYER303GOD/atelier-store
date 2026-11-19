"use client";

import Link from "next/link";
import { useState } from "react";

import { HeartIcon } from "@/components/icons";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { toggleSaved, useSavedItems } from "@/lib/saved-items";

type SaveButtonProps = {
  slug: string;
  name: string;
  /** `full`: labelled button for the product page. `icon`: heart over a product image. */
  variant?: "full" | "icon";
  className?: string;
};

export function SaveButton({ slug, name, variant = "full", className }: SaveButtonProps) {
  const saved = useSavedItems()?.includes(slug) ?? false;
  // Re-keying the icon replays the pop animation on every save, not on page load.
  const [pops, setPops] = useState(0);

  const onClick = () => {
    if (toggleSaved(slug)) setPops((n) => n + 1);
  };

  const icon = (
    <HeartIcon key={pops} filled={saved} className={cn("size-5", pops > 0 && saved && "animate-pop")} />
  );

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${name} from saved items` : `Save ${name} for later`}
        className={cn(
          "inline-flex size-10 items-center justify-center bg-paper/85 text-ink backdrop-blur-sm transition-[background-color,scale] hover:bg-paper active:scale-95",
          className,
        )}
      >
        {icon}
      </button>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        className={buttonStyles({ variant: "secondary", fullWidth: true })}
      >
        {icon}
        {saved ? "Saved" : "Save for later"}
      </button>
      {/* Announced politely; offers the next step without moving focus. */}
      <p aria-live="polite" className="mt-3 min-h-5 text-body-sm text-muted">
        {saved && (
          <>
            Saved to your list ·{" "}
            <Link href="/saved" className="text-ink underline underline-offset-4 hover:decoration-transparent">
              View saved items
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
