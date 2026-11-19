import { cn } from "@/lib/cn";
import { getStockStatus } from "@/lib/catalog";

const dot = {
  "in-stock": "bg-success",
  "low-stock": "bg-warning",
  "out-of-stock": "bg-subtle",
} as const;

const text = {
  "in-stock": "text-ink",
  "low-stock": "text-warning",
  "out-of-stock": "text-muted",
} as const;

/** Dot + label. Colour is never the only signal: the label always states the status. */
export function StockStatus({ stock, className }: { stock: number; className?: string }) {
  const status = getStockStatus(stock);
  return (
    <p className={cn("flex items-center gap-2 text-body-sm", text[status.state], className)}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", dot[status.state])} />
      {status.label}
    </p>
  );
}
