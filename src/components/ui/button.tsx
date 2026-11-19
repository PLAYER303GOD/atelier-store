import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "inverse";
type Size = "md" | "sm" | "icon";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-none border text-label font-medium uppercase whitespace-nowrap transition-[color,background-color,border-color,scale] select-none active:scale-[0.98] disabled:pointer-events-none aria-disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "border-ink bg-ink text-paper hover:bg-ink/80 hover:border-ink/80 disabled:border-line disabled:bg-line disabled:text-subtle aria-disabled:border-line aria-disabled:bg-line aria-disabled:text-subtle",
  secondary:
    "border-ink bg-transparent text-ink hover:bg-ink hover:text-paper disabled:border-line disabled:text-subtle aria-disabled:border-line aria-disabled:text-subtle",
  /** No chrome; inherits text colour so it works on light and transparent (dark) headers. */
  ghost:
    "border-transparent bg-transparent text-inherit hover:bg-surface disabled:text-subtle aria-disabled:text-subtle",
  /** White on dark imagery (hero, campaign banners). */
  inverse:
    "border-paper bg-paper text-ink hover:bg-paper/85 hover:border-paper/85 focus-visible:outline-paper",
};

const sizes: Record<Size, string> = {
  md: "h-12 px-8", // 48px — primary CTAs, add to bag, checkout
  sm: "h-10 px-5", // 40px — secondary actions, filters
  icon: "size-11 [&_svg]:size-5", // 44px square touch target — header icons, close
};

export type ButtonStyleProps = {
  variant?: Variant;
  size?: Size;
  /** Stretch to the container width (common for CTAs on mobile). */
  fullWidth?: boolean;
};

/** Class string for any element styled as a button (e.g. a Next `<Link>`). */
export function buttonStyles({
  variant = "primary",
  size = "md",
  fullWidth = false,
}: ButtonStyleProps = {}) {
  return cn(base, variants[variant], sizes[size], fullWidth && "w-full");
}

type ButtonProps = ComponentProps<"button"> & ButtonStyleProps;

/** Icon-only buttons (size="icon") must have an `aria-label`. */
export function Button({
  variant,
  size,
  fullWidth,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonStyles({ variant, size, fullWidth }), className)}
      {...props}
    />
  );
}
