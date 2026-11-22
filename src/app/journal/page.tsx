import type { Metadata } from "next";

import { StoryCard } from "@/components/journal/story-card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { stories } from "@/lib/journal";

export const metadata: Metadata = {
  title: "The journal — Atelier Store",
  description: "Campaigns, craft and the people behind the collections.",
};

/** Index of journal stories; same header frame as the listing pages. */
export default function JournalPage() {
  return (
    <div className="container-page pt-4 pb-section md:pt-6">
      <Breadcrumbs className="mb-6 md:mb-10" items={[{ label: "Home", href: "/" }, { label: "Journal" }]} />
      <p className="mb-2 text-caption text-muted uppercase">The journal</p>
      <h1 className="mb-2 text-display-sm">Stories</h1>
      <p className="mt-3 mb-8 max-w-xl text-body text-muted md:mb-10">
        Campaigns, craft and the people behind the collections.
      </p>
      <ul role="list" className="grid gap-x-0.5 gap-y-12 md:grid-cols-2">
        {stories.map((story) => (
          <li key={story.slug}>
            <StoryCard story={story} sizes="(min-width: 768px) 50vw, 100vw" />
          </li>
        ))}
      </ul>
    </div>
  );
}
