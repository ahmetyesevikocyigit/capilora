import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { galleryContent } from "@/lib/cms/gallery";
import { contentPath, type Block, type Locale, type PublicEntry } from "@/lib/cms/types";

export function GalleryStrip({ block, entries, lang }: { block: Block; entries: PublicEntry[]; lang: Locale }) {
  const gallery = galleryContent(entries);
  if (!gallery?.photos.length) return null;
  // Each half fills a wide screen even when only a few photos have been added.
  const repetitions = Math.max(1, Math.ceil(8 / gallery.photos.length));
  const loop = Array.from({ length: repetitions }, () => gallery.photos).flat();
  return (
    <section className="gallery-strip" id={block.anchor || undefined}
      aria-label={lang === "tr" ? "Fotoğraf galerisi" : "Photo gallery"}>
      <div className="gallery-strip-heading">
        <h2>{block.title || gallery.page.data.title}{block.light && ` ${block.light}`}</h2>
      </div>
      <Link className="gallery-strip-window" href={contentPath("page", lang, gallery.page.data)}
        aria-label={lang === "tr" ? "Galerideki tüm fotoğrafları görüntüle" : "View all photos in the gallery"}>
        <div className="gallery-strip-track" style={{ "--gallery-duration": `${loop.length * 5}s` } as CSSProperties}>
          {[false, true].map(duplicate => (
            <div className={`gallery-strip-group${duplicate ? " is-copy" : ""}`} key={String(duplicate)} aria-hidden="true">
              {loop.map((item, index) => (
                <div className={`gallery-strip-photo${index >= gallery.photos.length ? " is-repeat" : ""}`} key={`${index}:${item.id}`}>
                  <Image src={item.image} alt="" fill sizes="(max-width:760px) 240px, 360px"
                    unoptimized={item.image.startsWith("/api/media/")} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </Link>
    </section>
  );
}
