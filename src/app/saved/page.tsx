import type { Metadata } from "next";

import { SavedItemsList } from "@/components/product/saved-items-list";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata: Metadata = {
  title: "Saved items — Atelier Store",
  robots: { index: false }, // personal list, nothing to index
};

export default function SavedPage() {
  return (
    <div className="container-page pt-4 pb-section md:pt-6">
      <Breadcrumbs className="mb-6 md:mb-10" items={[{ label: "Home", href: "/" }, { label: "Saved items" }]} />
      <p className="mb-2 text-caption text-muted uppercase">Your selection</p>
      <h1 className="mb-2 text-display-sm">Saved items</h1>
      <p className="mb-8 text-body-sm text-muted md:mb-10">Saved items are kept on this device.</p>
      <SavedItemsList />
    </div>
  );
}
