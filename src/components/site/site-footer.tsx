import Link from "next/link";

import { footerNav, legalNav } from "@/lib/site";

const footerLink =
  "text-body-sm text-paper/70 transition-colors hover:text-paper focus-visible:outline-paper";

export function SiteFooter() {
  return (
    <footer className="bg-ink text-paper">
      <div className="container-page grid gap-10 py-section sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-title font-medium tracking-[0.35em] uppercase">Atelier</p>
          <p className="mt-4 max-w-xs text-body-sm text-paper/70">
            Ready-to-wear, leather goods and jewelry, designed in small runs and finished by hand.
          </p>
        </div>

        {footerNav.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="mb-4 text-caption text-paper uppercase">{group.title}</h2>
            <ul className="space-y-3">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={footerLink}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-paper/15">
        <div className="container-page flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
          <p className="text-caption text-paper/70 uppercase">© 2026 Atelier. All rights reserved.</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {legalNav.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={footerLink}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
