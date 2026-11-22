import type { Metadata } from "next";

import { JournalStory } from "@/components/journal/journal-story";
import { getStory } from "@/lib/journal";

// One static route per story (no URL data), so the full-bleed hero is in the first paint.
const story = getStory("the-quiet-season");

export const metadata: Metadata = {
  title: `${story.title} — Atelier Store`,
  description: story.standfirst,
};

export default function StoryPage() {
  return <JournalStory story={story} />;
}
