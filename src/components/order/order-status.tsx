import type { OrderStatus as Status } from "@/db/order-schema";
import { cn } from "@/lib/cn";

/** What the customer reads for each status (the app never shows the raw value). */
const statuses: Record<Status, { label: string; dot: string; text: string }> = {
  paid: { label: "Paid", dot: "bg-success", text: "text-ink" },
  processing: { label: "Payment processing", dot: "bg-warning", text: "text-warning" },
  failed: { label: "Payment failed", dot: "bg-error", text: "text-error" },
  pending: { label: "Awaiting payment", dot: "bg-warning", text: "text-warning" },
  expired: { label: "Not completed", dot: "bg-subtle", text: "text-muted" },
  canceled: { label: "Not completed", dot: "bg-subtle", text: "text-muted" },
};

/** Payment status as dot + label, like StockStatus: colour is never the only signal. */
export function OrderStatus({ status, className }: { status: Status; className?: string }) {
  const s = statuses[status];
  return (
    <p className={cn("flex items-center gap-2 text-body-sm", s.text, className)}>
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", s.dot)} />
      {s.label}
    </p>
  );
}
