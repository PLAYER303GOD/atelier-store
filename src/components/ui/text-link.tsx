import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

type Variant = "inline" | "nav" | "cta" | "muted";

const variants: Record<Variant, string> = {
  /** Links inside running text: underlined, underline fades on hover. */
  inline:
    "underline decoration-1 underline-offset-4 decoration-current transition-[text-decoration-color] hover:decoration-transparent",
  /**
   * Navigation: uppercase label with a 1px rule that draws in from the left on hover
   * and stays drawn for the current page (aria-current).
   */
  nav: "pb-1 text-label font-medium uppercase bg-[linear-gradient(currentColor,currentColor)] bg-no-repeat bg-[position:0_100%] bg-[length:0%_1px] transition-[background-size] duration-300 ease-out-soft hover:bg-[length:100%_1px] aria-[current=page]:bg-[length:100%_1px]",
  /** Standalone call to action ("View all", "Discover"): uppercase label, underline fades on hover. */
  cta: "text-label font-medium uppercase underline decoration-1 underline-offset-[6px] decoration-current transition-[text-decoration-color] hover:decoration-transparent",
  /** Secondary meta links (legal, help): grey, darkens on hover. */
  muted: "text-muted transition-colors hover:text-ink",
};

type TextLinkProps = ComponentProps<typeof Link> & { variant?: Variant };

export function TextLink({ variant = "inline", className, ...props }: TextLinkProps) {
  return <Link className={cn(variants[variant], className)} {...props} />;
}
