import type { ComponentProps, ElementType } from "react";

import { cn } from "@/lib/cn";

const sizes = {
  page: "container-page", // 1920px max — grids, full-bleed sections
  content: "container-content", // 1280px max — PDP, checkout, account
  prose: "container-prose", // 640px max — long-form text
} as const;

type ContainerProps<T extends ElementType> = {
  as?: T;
  size?: keyof typeof sizes;
} & Omit<ComponentProps<T>, "as">;

/** Horizontally centred wrapper with the responsive page gutter (16 / 24 / 40px). */
export function Container<T extends ElementType = "div">({
  as,
  size = "page",
  className,
  ...props
}: ContainerProps<T>) {
  const Tag: ElementType = as ?? "div";
  return <Tag className={cn(sizes[size], className)} {...props} />;
}
