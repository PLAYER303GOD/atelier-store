"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

export const adminSections = [
  { label: "Overview", href: "/admin", exact: true },
  { label: "Products", href: "/admin/products", exact: false },
  { label: "Categories", href: "/admin/categories", exact: false },
  { label: "Stock", href: "/admin/stock", exact: false },
  { label: "Orders", href: "/admin/orders", exact: false },
] as const;

/**
 * Admin section navigation, same pattern as AccountNav: a swipeable tab row on mobile, a sticky
 * vertical list with a 1px ink rule on the current item from 1024px. Static (no session data), so
 * it sits in the admin layout's shell. It is not what protects admin pages: each page calls
 * requireAdmin() and each action getAdminForAction().
 */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin"
      className="transition-[top] duration-500 ease-out-soft lg:sticky lg:top-[calc(var(--header-offset)+2rem)]"
    >
      <p className="mb-4 hidden text-caption text-muted uppercase lg:block">Admin</p>
      <ul
        role="list"
        className="no-scrollbar -mx-gutter flex gap-6 overflow-x-auto border-b px-gutter lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-b-0 lg:border-l lg:px-0"
      >
        {adminSections.map((section) => {
          const current = section.exact ? pathname === section.href : pathname.startsWith(section.href);
          return (
            <li key={section.href} className="shrink-0">
              <Link
                href={section.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "block py-3 text-label font-medium whitespace-nowrap uppercase transition-colors duration-200",
                  "-mb-px border-b lg:mb-0 lg:-ml-px lg:border-b-0 lg:border-l lg:py-2.5 lg:pl-5",
                  current ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink",
                )}
              >
                {section.label}
              </Link>
            </li>
          );
        })}
        <li className="shrink-0 lg:mt-6 lg:border-t lg:pt-4 lg:pl-5">
          <Link
            href="/account"
            className="block -mb-px border-b border-transparent py-3 text-label font-medium whitespace-nowrap text-muted uppercase transition-colors duration-200 hover:text-ink lg:mb-0 lg:border-0 lg:py-2.5"
          >
            My account
          </Link>
        </li>
      </ul>
    </nav>
  );
}
