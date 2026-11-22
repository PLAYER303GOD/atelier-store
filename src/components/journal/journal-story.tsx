import { StoryCard } from "@/components/journal/story-card";
import { ProductCard } from "@/components/product/product-card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { FullBleedHero } from "@/components/ui/full-bleed-hero";
import { MediaFrame } from "@/components/ui/media-frame";
import { ProductGrid } from "@/components/ui/product-grid";
import { SectionHeader } from "@/components/ui/section-header";
import { SmoothImage } from "@/components/ui/smooth-image";
import { TextLink } from "@/components/ui/text-link";
import { type Story, type StoryBlock, stories } from "@/lib/journal";
import { getProductsBySlugs } from "@/lib/products";

/**
 * A journal story / campaign page: full-bleed hero (transparent header), a prose column with
 * images breaking out to the content width, "Shop the story" product cards, and the next story.
 * Rendered by one static route per story, so there is no URL data and no <Suspense> around the
 * hero (its data-header-overlay must be in the first paint).
 */
export async function JournalStory({ story }: { story: Story }) {
  const products = await getProductsBySlugs(story.shop.products);
  const others = stories.filter((s) => s.slug !== story.slug);

  return (
    <article>
      <FullBleedHero
        id="story-title"
        eyebrow={story.eyebrow}
        title={story.title}
        body={story.standfirst}
        image={story.image}
      />

      <div className="container-page pt-4 md:pt-6">
        <Breadcrumbs
          items={[{ label: "Home", href: "/" }, { label: "Journal", href: "/journal" }, { label: story.title }]}
        />
      </div>

      <div className="pt-section pb-section">
        <p className="container-prose mb-8 text-caption text-muted uppercase md:mb-10">
          {story.date} · {story.readingTime}
        </p>
        {story.blocks.map((block, index) => (
          <Block key={index} block={block} lead={index === 0} />
        ))}
      </div>

      {products.length > 0 && (
        <section aria-labelledby="shop-story-title" className="container-page pb-section">
          <SectionHeader
            id="shop-story-title"
            eyebrow="Shop the story"
            title={story.shop.title}
            action={
              <TextLink href={story.shop.cta.href} variant="cta">
                {story.shop.cta.label}
              </TextLink>
            }
          />
          <ProductGrid layout="feature">
            {products.map((product) => (
              <li key={product.slug}>
                <ProductCard product={product} />
              </li>
            ))}
          </ProductGrid>
        </section>
      )}

      {others.length > 0 && (
        <section aria-labelledby="more-stories-title" className="bg-surface">
          <div className="container-page py-section">
            <SectionHeader
              id="more-stories-title"
              eyebrow="The journal"
              title="More stories"
              action={
                <TextLink href="/journal" variant="cta">
                  All stories
                </TextLink>
              }
            />
            <ul role="list" className="reveal grid gap-x-0.5 gap-y-10 md:grid-cols-2">
              {others.map((other) => (
                <li key={other.slug}>
                  <StoryCard story={other} sizes="(min-width: 768px) 50vw, 100vw" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </article>
  );
}

function Block({ block, lead }: { block: StoryBlock; lead: boolean }) {
  // Prose sits in the reading column; images break out to the wider content column.
  const gap = "mt-12 md:mt-20";
  switch (block.type) {
    case "text":
      return (
        <div className={`container-prose reveal ${gap}`}>
          {block.heading && <h2 className="mb-4 text-title">{block.heading}</h2>}
          <div className="space-y-5">
            {block.paragraphs.map((paragraph, i) => (
              <p key={i} className={lead && i === 0 ? "text-body-lg" : "text-body text-ink/85"}>
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      );
    case "image":
      return (
        <figure className={`container-content reveal ${gap}`}>
          <MediaFrame ratio="hero">
            <SmoothImage
              src={block.image.src}
              alt={block.image.alt}
              fill
              sizes="(min-width: 1344px) 1280px, 100vw"
              className="object-cover"
            />
          </MediaFrame>
          {block.caption && <figcaption className="mt-3 text-caption text-muted">{block.caption}</figcaption>}
        </figure>
      );
    case "pair":
      return (
        <figure className={`container-content reveal ${gap}`}>
          <div className="grid grid-cols-2 gap-0.5">
            {block.images.map((image) => (
              <MediaFrame key={image.src} ratio="editorial">
                <SmoothImage src={image.src} alt={image.alt} fill sizes="(min-width: 1344px) 640px, 50vw" className="object-cover" />
              </MediaFrame>
            ))}
          </div>
          {block.caption && <figcaption className="mt-3 text-caption text-muted">{block.caption}</figcaption>}
        </figure>
      );
    case "quote":
      return (
        <figure className={`container-prose reveal ${gap} border-y border-line py-10 text-center md:py-14`}>
          <blockquote className="text-display-sm text-balance">“{block.text}”</blockquote>
          {block.cite && <figcaption className="mt-5 text-caption text-muted uppercase">{block.cite}</figcaption>}
        </figure>
      );
  }
}
