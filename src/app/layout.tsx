import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Atelier Store",
  description: "Ready-to-wear, leather goods and jewelry, designed in small runs and finished by hand.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-scroll-behavior: Next turns smooth scrolling off while it changes routes.
    <html lang="en" className={`${geistSans.variable} h-full`} data-scroll-behavior="smooth">
      <body className="flex min-h-full flex-col">
        {/* Without JS, images can't report that they loaded — show them straight away. */}
        <noscript>
          <style>{"[data-fade]{opacity:1}"}</style>
        </noscript>
        <a
          href="#main"
          className="sr-only bg-ink px-4 py-3 text-label text-paper uppercase focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
