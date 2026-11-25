"use client";

import { Button } from "@/components/ui/button";
import { MediaFrame } from "@/components/ui/media-frame";
import { SmoothImage } from "@/components/ui/smooth-image";
import { TextField } from "@/components/ui/text-field";
import type { ProductImage } from "@/db/catalog-schema";
import { IMAGE_URL_PATTERN, PRODUCT_LIMITS } from "@/lib/admin-validation";

type ImageFieldsProps = {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  /** Visible error for a field key (`images`, `images.<i>.src`, `images.<i>.alt`), if any. */
  errorFor: (key: string) => string | undefined;
  onBlurField: (key: string) => void;
  /** Report whether the image at this address failed to load (a broken link blocks saving). */
  onBroken: (src: string, broken: boolean) => void;
  readOnly: boolean;
};

/**
 * Product photos as pasted URLs, 1–6 rows; the first is the card shot. Each row previews its image
 * through the same next/image (SmoothImage) the store uses, as soon as the URL passes the shared
 * IMAGE_URL_PATTERN, so the admin sees exactly what customers will. Fields post as imageSrc /
 * imageAlt pairs, in order.
 */
export function ImageFields({ images, onChange, errorFor, onBlurField, onBroken, readOnly }: ImageFieldsProps) {
  const update = (index: number, patch: Partial<ProductImage>) =>
    onChange(images.map((image, i) => (i === index ? { ...image, ...patch } : image)));
  const move = (from: number, to: number) => {
    const next = [...images];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
  };
  const listError = errorFor("images");

  return (
    <div>
      <ol className="space-y-6">
        {images.map((image, i) => {
          const src = image.src.trim();
          const previewable = IMAGE_URL_PATTERN.test(src);
          const position = i === 0 ? "Card image" : `Image ${i + 1}`;
          return (
            <li key={i} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 border-t pt-6 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-6">
              <MediaFrame ratio="product">
                {previewable ? (
                  <SmoothImage
                    key={src}
                    src={src}
                    alt={image.alt.trim() ? `Preview: ${image.alt.trim()}` : "Preview"}
                    fill
                    sizes="112px"
                    className="object-cover"
                    onLoad={() => onBroken(src, false)}
                    onError={() => onBroken(src, true)}
                  />
                ) : (
                  <span className="flex h-full items-center justify-center p-2 text-center text-caption text-muted uppercase">
                    No preview
                  </span>
                )}
              </MediaFrame>
              <div className="min-w-0 space-y-4">
                <p className="text-label font-medium text-muted uppercase">{position}</p>
                <TextField
                  label="Image address"
                  name="imageSrc"
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  placeholder="https://images.unsplash.com/photo-…"
                  value={image.src}
                  readOnly={readOnly}
                  onChange={(event) => update(i, { src: event.target.value })}
                  onBlur={() => onBlurField(`images.${i}.src`)}
                  error={errorFor(`images.${i}.src`)}
                />
                <TextField
                  label="Alt text"
                  name="imageAlt"
                  type="text"
                  autoComplete="off"
                  maxLength={PRODUCT_LIMITS.alt}
                  value={image.alt}
                  readOnly={readOnly}
                  onChange={(event) => update(i, { alt: event.target.value })}
                  onBlur={() => onBlurField(`images.${i}.alt`)}
                  error={errorFor(`images.${i}.alt`)}
                  hint="Describe the photo for people who can't see it."
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={readOnly || i === 0}
                    onClick={() => move(i, i - 1)}
                    aria-label={`Move ${position.toLowerCase()} up`}
                  >
                    Move up
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={readOnly || i === images.length - 1}
                    onClick={() => move(i, i + 1)}
                    aria-label={`Move ${position.toLowerCase()} down`}
                  >
                    Move down
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={readOnly || images.length === 1}
                    onClick={() => onChange(images.filter((_, j) => j !== i))}
                    aria-label={`Remove ${position.toLowerCase()}`}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {listError && <p className="mt-4 text-body-sm text-error">{listError}</p>}
      <Button
        variant="secondary"
        size="sm"
        className="mt-6"
        disabled={readOnly || images.length >= PRODUCT_LIMITS.images}
        onClick={() => onChange([...images, { src: "", alt: "" }])}
      >
        Add image
      </Button>
      <p className="mt-3 text-body-sm text-muted">
        Up to {PRODUCT_LIMITS.images} photos from Unsplash. The first is used on product cards.
      </p>
    </div>
  );
}
