import type { Locale, PublicEntry } from "@/lib/cms/types";
import { PressClipping, type ClippingImage } from "./press-clipping";

export function PressArchive({ entries, lang, limit }: {
  entries: PublicEntry[];
  lang: Locale;
  limit: number;
}) {
  const stories = entries.filter(entry => entry.kind === "press")
    .sort((a, b) => a.data.order - b.data.order || b.data.publishedAt.localeCompare(a.data.publishedAt));

  return <div className="press-archive">
    {(limit ? stories.slice(0, limit) : stories).map(({ id, data }, index) => {
      const images: ClippingImage[] = [
        ...(data.image ? [{ src: data.image, alt: data.alt || `${data.publication} — ${data.title}` }] : []),
        ...data.blocks.filter(block => block.type === "gallery" && block.enabled)
          .flatMap(block => block.items.filter(item => item.image).map(item => ({
            src: item.image, alt: item.alt || item.title || `${data.publication} — ${data.title}`,
          }))),
      ];
      return <article key={id} className="press-story">
        <PressClipping images={images} title={data.title} lang={lang} eager={index < 2} />
        <div className="press-story-caption">
          <p className="press-publication">{data.publication}</p>
          <h2>{data.sourceUrl
            ? <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer">{data.title}</a>
            : data.title}</h2>
          {data.excerpt && <p className="press-excerpt">{data.excerpt}</p>}
          {data.publishedAt && <time dateTime={data.publishedAt} className="press-date">{
            new Date(data.publishedAt).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-GB", {
              day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
            })
          }</time>}
        </div>
      </article>;
    })}
  </div>;
}
