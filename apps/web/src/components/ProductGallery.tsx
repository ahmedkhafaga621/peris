import { useEffect, useRef, useState } from "react";
import type { CatalogImage } from "@/data/catalog";

type ProductGalleryProps = {
  images: CatalogImage[];
  colorKey?: string | null;
  className?: string;
};

export function ProductGallery({
  images,
  colorKey = "all",
  className = "",
}: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  const thumbsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActive(0);
  }, [colorKey, images.length, images[0]?.src]);

  useEffect(() => {
    const root = thumbsRef.current;
    if (!root) return;
    const thumb = root.querySelector<HTMLElement>(`[data-thumb="${active}"]`);
    thumb?.scrollIntoView({
      behavior: "smooth",
      inline: "nearest",
      block: "nearest",
    });
  }, [active]);

  if (!images.length) return null;

  const current = images[Math.min(active, images.length - 1)] ?? images[0];
  const canBrowse = images.length > 1;

  function step(delta: number) {
    setActive((index) => {
      const next = index + delta;
      if (next < 0) return images.length - 1;
      if (next >= images.length) return 0;
      return next;
    });
  }

  return (
    <div className={`gallery ${className}`.trim()} key={colorKey || "all"}>
      <div className="gallery-stage">
        <img
          key={`${current.id ?? current.src}-${current.color ?? "shared"}`}
          src={current.src}
          alt={current.alt}
          style={{ objectPosition: current.position }}
        />
        {canBrowse ? (
          <>
            <button
              type="button"
              className="gallery-nav gallery-nav--prev"
              aria-label="Previous photograph"
              onClick={() => step(-1)}
            >
              ‹
            </button>
            <button
              type="button"
              className="gallery-nav gallery-nav--next"
              aria-label="Next photograph"
              onClick={() => step(1)}
            >
              ›
            </button>
            <p className="gallery-count" aria-live="polite">
              {active + 1} / {images.length}
            </p>
          </>
        ) : null}
      </div>
      {canBrowse ? (
        <div className="gallery-thumbs" ref={thumbsRef} role="list">
          {images.map((image, index) => (
            <button
              key={`${image.id ?? image.src}-${index}`}
              type="button"
              role="listitem"
              data-thumb={index}
              className={
                index === active
                  ? "gallery-thumb is-active"
                  : "gallery-thumb"
              }
              aria-label={`Photograph ${index + 1}`}
              aria-current={index === active ? "true" : undefined}
              onClick={() => setActive(index)}
            >
              <img
                src={image.src}
                alt=""
                style={{ objectPosition: image.position }}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
