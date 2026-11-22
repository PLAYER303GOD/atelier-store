import Link from "next/link";

import { BagIcon, SearchIcon } from "@/components/icons";
import { AccountLink } from "@/components/site/account-link";
import { HeaderNav } from "@/components/site/header-nav";
import { HeaderShell } from "@/components/site/header-shell";
import { MobileMenu } from "@/components/site/mobile-menu";
import { SavedLink } from "@/components/site/saved-link";
import { buttonStyles } from "@/components/ui/button";
import { announcement, primaryNav, secondaryNav } from "@/lib/site";

const iconLink = buttonStyles({ variant: "ghost", size: "icon" });

export function SiteHeader() {
  return (
    <>
      <p className="flex min-h-9 items-center justify-center bg-ink px-gutter py-2 text-center text-caption text-paper uppercase">
        {announcement}
      </p>

      {/*
        Solid by default. Over a hero (<HeaderOverlay>) it starts transparent and turns solid
        once scrolled, hovered (pointer devices) or showing keyboard focus. It slides away while
        scrolling down and returns on scroll up (HeaderShell). The hairline is an ::after element
        so the header's height stays exactly --header-height.
      */}
      <HeaderShell
        className={[
          "sticky top-0 z-40 bg-paper text-ink",
          "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-line",
          "transition-[background-color,color,translate] duration-500 ease-out-soft after:transition-colors after:duration-500",
          "data-hidden:-translate-y-full",
          "header-overlay:bg-transparent header-overlay:text-paper header-overlay:after:bg-transparent",
        ].join(" ")}
      >
        {/* Two icons on each side keep the wordmark optically centred at every width. */}
        <div className="container-page grid h-14 grid-cols-[1fr_auto_1fr] items-center md:h-16">
          {/* Visibility lives on wrappers: buttonStyles() sets inline-flex, which would override `hidden`. */}
          <div className="-ml-3 flex items-center">
            <div className="lg:hidden">
              <MobileMenu primary={primaryNav} secondary={secondaryNav} />
            </div>
            <Link href="/search" className={iconLink} aria-label="Search">
              <SearchIcon />
            </Link>
          </div>

          <Link
            href="/"
            className="mr-[-0.35em] text-title font-medium tracking-[0.35em] uppercase md:text-display-sm"
          >
            Atelier
          </Link>

          <div className="-mr-3 flex items-center justify-end">
            <div className="hidden lg:block">
              <AccountLink />
            </div>
            <SavedLink />
            <Link href="/bag" className={iconLink} aria-label="Shopping bag">
              <BagIcon />
            </Link>
          </div>
        </div>

        <HeaderNav links={primaryNav} />
      </HeaderShell>
    </>
  );
}
