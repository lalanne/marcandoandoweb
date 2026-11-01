"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { preload } from "react-dom";
import { imageUrl } from "@/lib/catalog/images";
import {
  nextPhoto,
  photosToPreload,
  previousPhoto,
  swipeStep,
} from "@/lib/catalog/photos";
import type { CatalogImage } from "@/lib/catalog/types";

// All of a product's photos on its card (spec 002, criteria 46 to 50). Only the
// first photo is in the page on load; once the photo on show has loaded, the next and
// the previous ones are preloaded (a low-priority image preload of the same URL, so
// the browser reuses it when the visitor moves; criterion 49). The files are already
// resized to about 1000 px WebP on upload, so they are served as they are.
// The box is brand teal until its photo arrives, so there is never an empty gap.

const photoClass =
  "aspect-[4/3] w-full rounded-2xl border-2 border-brand-night bg-brand-teal/30 object-cover";

const roundButton =
  "flex h-11 w-11 items-center justify-center rounded-full border-2 border-brand-night bg-white text-brand-night shadow-[2px_2px_0_var(--brand-night)]";

function Arrow({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

function Photo({ image, onLoad }: { image: CatalogImage; onLoad?: () => void }) {
  return (
    <Image
      src={imageUrl(image.storagePath)}
      alt={image.altText}
      width={600}
      height={450}
      loading="lazy"
      unoptimized
      onLoad={onLoad}
      className={photoClass}
    />
  );
}

export function ProductPhotos({ images, name }: { images: CatalogImage[]; name: string }) {
  const [index, setIndex] = useState(0);
  const [loadedPath, setLoadedPath] = useState<string | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const count = images.length;
  const shownPath = images[Math.min(index, count - 1)]?.storagePath;

  // Once the photo on show has loaded, ask for its neighbors.
  useEffect(() => {
    if (count < 2 || loadedPath !== shownPath) return;
    for (const i of photosToPreload(Math.min(index, count - 1), count)) {
      preload(imageUrl(images[i].storagePath), { as: "image", fetchPriority: "low" });
    }
  }, [count, index, images, loadedPath, shownPath]);

  if (count === 0) {
    return (
      <div aria-hidden="true" className={`${photoClass} bg-brand-teal/30`} />
    );
  }
  if (count === 1) return <Photo image={images[0]} />;

  const shown = Math.min(index, count - 1);
  const current = images[shown];
  return (
    <div className="flex flex-col gap-1" role="group" aria-label={`Fotos de ${name}`}>
      <div
        data-testid="photo-area"
        className="relative touch-pan-y select-none"
        onPointerDown={(e) => {
          if (e.pointerType === "mouse") return;
          start.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const from = start.current;
          start.current = null;
          if (!from) return;
          const step = swipeStep(e.clientX - from.x, e.clientY - from.y);
          if (step === 1) setIndex((i) => nextPhoto(i, count));
          if (step === -1) setIndex((i) => previousPhoto(i, count));
        }}
        onPointerCancel={() => {
          start.current = null;
        }}
      >
        <Photo
          key={current.storagePath}
          image={current}
          onLoad={() => setLoadedPath(current.storagePath)}
        />
        <span
          data-testid="photo-counter"
          className="absolute right-2 top-2 rounded-full border-2 border-brand-night bg-white px-2 text-sm font-semibold text-brand-night"
        >
          {index + 1} / {count}
        </span>
        <button
          type="button"
          aria-label="Foto anterior"
          onClick={() => setIndex((i) => previousPhoto(i, count))}
          className={`${roundButton} absolute left-2 top-1/2 -translate-y-1/2`}
        >
          <Arrow direction="left" />
        </button>
        <button
          type="button"
          aria-label="Foto siguiente"
          onClick={() => setIndex((i) => nextPhoto(i, count))}
          className={`${roundButton} absolute right-2 top-1/2 -translate-y-1/2`}
        >
          <Arrow direction="right" />
        </button>
      </div>
      <div className="flex flex-wrap justify-center">
        {images.map((image, i) => (
          <button
            key={image.storagePath}
            type="button"
            aria-label={`Ver foto ${i + 1}`}
            aria-current={i === index ? "true" : undefined}
            onClick={() => setIndex(i)}
            className="flex h-11 w-11 items-center justify-center rounded-full"
          >
            <span
              aria-hidden="true"
              className={`h-3 w-3 rounded-full border-2 border-brand-night ${
                i === index ? "bg-brand-night" : "bg-white"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
