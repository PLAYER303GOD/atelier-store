import Link from "next/link";

import { MediaFrame } from "@/components/ui/media-frame";
import { SmoothImage } from "@/components/ui/smooth-image";
import type { Story } from "@/lib/journal";

/** Journal teaser: same tile treatment as the homepage's featured collections. */
export function StoryCard({ story, sizes }: { story: Story; sizes: string }) {
  return (
    <Link href={`/journal/${story.slug}`} className="group block">
      <MediaFrame ratio="editorial">
        <SmoothImage
          src={story.image.src}
          alt={story.image.alt}
          fill
          sizes={sizes}
          className="object-cover transition-[opacity,scale] duration-700 ease-out-soft group-hover:scale-[1.03]"
        />
      </MediaFrame>
      <div className="px-1 pt-4">
        <p className="text-caption text-muted uppercase">
          {story.date} · {story.readingTime}
        </p>
        <h3 className="mt-2 text-title">{story.title}</h3>
        <p className="mt-1 max-w-md text-body-sm text-muted">{story.standfirst}</p>
        <span
          aria-hidden="true"
          className="mt-3 inline-block text-label font-medium uppercase underline decoration-1 underline-offset-[6px] transition-[text-decoration-color] group-hover:decoration-transparent"
        >
          Read the story
        </span>
      </div>
    </Link>
  );
}
