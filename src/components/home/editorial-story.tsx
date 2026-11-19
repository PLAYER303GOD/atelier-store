import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";
import { MediaFrame } from "@/components/ui/media-frame";
import { SmoothImage } from "@/components/ui/smooth-image";
import { editorial } from "@/lib/catalog";

/** Half-bleed image beside a short story; stacks on mobile. */
export function EditorialStory() {
  return (
    <section aria-labelledby="editorial-title" className="bg-surface">
      <div className="mx-auto grid max-w-(--container-page) md:grid-cols-2">
        <MediaFrame ratio="editorial" className="md:aspect-auto md:min-h-[40rem]">
          <SmoothImage
            src={editorial.image.src}
            alt={editorial.image.alt}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </MediaFrame>

        <div className="reveal flex flex-col justify-center px-gutter py-section md:px-12 xl:px-24">
          <p className="mb-3 text-caption text-muted uppercase">{editorial.eyebrow}</p>
          <h2 id="editorial-title" className="max-w-md text-display-sm">
            {editorial.title}
          </h2>
          <p className="mt-5 max-w-md text-body text-muted">{editorial.body}</p>
          <Link
            href="/journal/made-to-travel"
            className={`${buttonStyles({ variant: "secondary" })} mt-8 self-start`}
          >
            Read the story
          </Link>
        </div>
      </div>
    </section>
  );
}
