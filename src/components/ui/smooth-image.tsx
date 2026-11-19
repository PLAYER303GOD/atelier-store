"use client";

import Image, { type ImageProps } from "next/image";
import { useCallback, useState } from "react";

/**
 * next/image that fades in once decoded instead of popping in (see [data-fade] in globals.css).
 * Sits on MediaFrame's grey surface, so the frame shows until the photo is ready.
 */
export function SmoothImage({ onLoad, alt, ...props }: ImageProps) {
  const [loaded, setLoaded] = useState(false);

  // Images can finish loading before hydration, when onLoad has already fired.
  const ref = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <Image
      {...props}
      alt={alt}
      ref={ref}
      data-fade=""
      data-loaded={loaded ? "" : undefined}
      onLoad={(event) => {
        setLoaded(true);
        onLoad?.(event);
      }}
    />
  );
}
