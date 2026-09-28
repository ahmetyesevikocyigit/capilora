import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Plus, Star } from "lucide-react";
import type { CSSProperties } from "react";
import { copy } from "@/content/site";
import {
  contentPath,
  wa,
  type Block,
  type ContentData,
  type Locale,
  type PublicEntry,
} from "@/lib/cms/types";
import { PageHeading } from "./page-heading";
import { HeroVideo } from "./hero-video";
import { Results } from "./results";
import { ReviewsMarquee } from "./reviews-marquee";
import { GalleryStrip } from "./gallery-strip";
import { PressArchive } from "./press-archive";
import { ArticleList } from "./article-list";
import { ArticleCard } from "./article-card";
import { ArticleToc } from "./article-toc";
import { RichText, tocItems } from "./cms-rich-text";
const external = { target: "_blank", rel: "noopener noreferrer" } as const;
const photo = (src: string, alt: string, cls?: string) => (
  <Image
    className={cls}
    src={src}
    alt={alt}
    fill
    sizes="(max-width:760px) 90vw, 650px"
    unoptimized={src.startsWith("/api/media/")}
  />
);
function Title({ block: b }: { block: Block }) {
  return b.title || b.light ? (
    <div className="section-heading">
      <h2>
        <strong>{b.title}</strong>
        {b.light && (
          <>
            <br />
            <span>{b.light}</span>
          </>
        )}
      </h2>
    </div>
  ) : null;
}
export function CmsPage({
  entry,
  entries,
  settings,
  lang,
}: {
  entry: PublicEntry;
  entries: PublicEntry[];
  settings: ContentData;
  lang: Locale;
}) {
  if (entry.kind === "article")
    return (
      <ArticlePage
        entry={entry}
        entries={entries}
        settings={settings}
        lang={lang}
      />
    );
  return (
    <main id="main">
      {entry.id !== "home" && (
        <PageHeading title={entry.data.title} light={entry.data.light} />
      )}
      {entry.data.blocks
        .filter((b) => b.enabled)
        .map((b) => (
          <CmsBlock
            key={b.id}
            block={b}
            entries={entries}
            settings={settings}
            lang={lang}
          />
        ))}
    </main>
  );
}
function teasers(entries: PublicEntry[], lang: Locale) {
  return entries
    .filter((e) => e.kind === "article")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((e) => ({
      id: e.id,
      href: contentPath("article", lang, e.data),
      title: e.data.title,
      excerpt: e.data.excerpt,
      image: e.data.image,
      category:
        entries.find(
          (c) =>
            c.kind === "category" &&
            (c.id === e.data.categoryId || c.data.slug === e.data.categoryId),
        )?.data.title || "",
      categoryId: e.data.categoryId,
    }));
}
function CmsBlock({
  block: b,
  entries,
  settings: s,
  lang,
}: {
  block: Block;
  entries: PublicEntry[];
  settings: ContentData;
  lang: Locale;
}) {
  const attr = { id: b.anchor || undefined };
  const href = (url: string) =>
    url === "#whatsapp" || url === "https://wa.me/905335695670" ? wa(s) : url;
  const text = (s: string) => s.split("\n\n").map((p, i) => <p key={i}>{p}</p>);
  if (b.type === "hero")
    return (
      <section {...attr} className="hero">
        <HeroVideo
          desktop={b.desktopVideo}
          mobile={b.mobileVideo}
          poster={b.poster}
        />
        <div className="hero-shade" />
        <div className="hero-content">
          <h1>
            <strong>{b.title}</strong>
            <span>
              {b.light.replace(/\.$/, "")}
              <i />
            </span>
          </h1>
          {b.text && <p className="hero-description">{b.text}</p>}
          <div className="hero-actions">
            {b.href && (
              <Link className="button button-teal" href={href(b.href)}>
                {b.buttonLabel}
              </Link>
            )}
            {b.secondaryHref && (
              <a
                className="button button-glass"
                href={href(b.secondaryHref)}
                {...external}
              >
                {b.secondaryLabel}
              </a>
            )}
          </div>
        </div>
      </section>
    );
  if (b.type === "cards") {
    const methodsPage = entries.find(
      (entry) => entry.kind === "page" && entry.id === "methods",
    );
    return (
      <section {...attr} className="section services">
        <div className="section-introduction">
          <Title block={b} />
          {b.text && <p className="section-intro">{b.text}</p>}
        </div>
        <div className="service-grid">
          {b.items.map((i, index) => (
            <article
              className="service-card"
              key={i.id}
              style={{ "--stack-index": index } as CSSProperties}
            >
              <Link className="service-card-link" href={i.href || "#contact"}>
                {i.image && (
                  <div className="service-card-image">
                    {photo(i.image, i.alt)}
                  </div>
                )}
                <div className="service-card-body">
                  <h3>{i.title}</h3>
                  <p>{i.text}</p>
                </div>
              </Link>
            </article>
          ))}
        </div>
        {b.href && methodsPage && (
          <article className="method-card">
            <Link
              className="method-card-link"
              href={contentPath("page", lang, methodsPage.data)}
            >
              <div className="method-card-copy">
                <h3>{b.buttonLabel}</h3>
                <p>{b.text2}</p>
              </div>
            </Link>
          </article>
        )}
      </section>
    );
  }
  if (b.type === "text")
    return (
      <section {...attr} className="section detail-intro">
        <h2>
          {b.title} {b.light}
        </h2>
        <div>
          <div className="lead-paragraph">{text(b.text)}</div>
          {b.text2 && text(b.text2)}
          <div className="focus-list">
            {b.items.map((i) => (
              <div key={i.id}>
                <h3>{i.title}</h3>
                <p>{i.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  if (b.type === "imageText")
    return (
      <section {...attr} className="section about-section">
        <div className="about-grid">
          {b.image && (
            <div className="about-photo">{photo(b.image, b.alt)}</div>
          )}
          <div className="about-copy">
            <h2>
              <strong>{b.title}</strong>
              <br />
              <span>{b.light}</span>
            </h2>
            {text(b.text)}
            {text(b.text2)}
            {b.href && (
              <Link className="text-link" href={href(b.href)}>
                {b.buttonLabel}
              </Link>
            )}
          </div>
        </div>
      </section>
    );
  if (b.type === "steps")
    return (
      <section {...attr} className="process-section">
        <div className="section">
          <Title block={b} />
          <div className="process-grid">
            {b.items.map((i, n) => (
              <article key={i.id}>
                <span className="process-number">
                  {String(n + 1).padStart(2, "0")}
                </span>
                <h3>{i.title}</h3>
                <p>{i.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  if (b.type === "faq")
    return (
      <section {...attr} className="section faq-section">
        <Title block={b} />
        <div className="faq-list">
          {b.items.map((i) => (
            <details key={i.id}>
              <summary>
                {i.title}
                <Plus size={20} />
              </summary>
              <p>{i.text}</p>
            </details>
          ))}
        </div>
      </section>
    );
  if (b.type === "methods")
    return (
      <section {...attr} className="section method-details">
        <Title block={b} />
        {b.items.map((i) => (
          <article className="method-detail-card" key={i.id}>
            <span>{i.title}</span>
            <div>
              <h2>{i.alt}</h2>
              <p>{i.text}</p>
              {i.href && (
                <a href={i.href} {...external}>
                  Kaynak
                  <ArrowUpRight size={14} />
                </a>
              )}
            </div>
          </article>
        ))}
      </section>
    );
  if (b.type === "galleryStrip") return <GalleryStrip block={b} entries={entries} lang={lang} />;
  if (b.type === "gallery")
    return (
      <section {...attr} className="section">
        <Title block={b} />
        <div className="cms-gallery">
          {b.items.filter(i => i.image).map((i, index) => (
            <figure key={i.id}>
              <div>{photo(i.image, i.alt || i.title || `${lang === "tr" ? "Galeri fotoğrafı" : "Gallery photo"} ${index + 1}`)}</div>
              {i.title && <figcaption>{i.title}</figcaption>}
            </figure>
          ))}
        </div>
      </section>
    );
  if (b.type === "results") {
    const data = entries
      .filter((e) => e.kind === "result")
      .sort((a, c) => a.data.order - c.data.order)
      .map((e) => ({
        id: e.id,
        title: { tr: e.data.title, en: e.data.title },
        description: { tr: e.data.excerpt, en: e.data.excerpt },
        before: e.data.before,
        after: e.data.after,
        sourceUrl: e.data.sourceUrl,
        sourceDate: e.data.publishedAt,
        position: {
          before: e.data.beforePosition,
          after: e.data.afterPosition,
        },
      }));
    return (
      <section {...attr} className="results-section">
        <div className="section">
          <Title block={b} />
          {data.length > 0 && (
            <Results
              lang={lang}
              data={data}
              text={{
                ...copy[lang].results,
                disclaimer: b.text || copy[lang].results.disclaimer,
              }}
            />
          )}
        </div>
      </section>
    );
  }
  if (b.type === "reviews") {
    const data = entries
      .filter((e) => e.kind === "review")
      .sort((a, c) => a.data.order - c.data.order);
    return (
      <section {...attr} className="reviews-section">
        <div className="section">
          <div className="section-heading heading-row">
            <Title block={b} />
            <a className="google-rating" href={s.maps} {...external}>
              <Image
                src="/media/google.png"
                width={30}
                height={30}
                alt="Google"
              />
              <div>
                <span className="rating-number">
                  {s.rating.toLocaleString(lang, { minimumFractionDigits: 1 })}
                  <span className="rating-stars">★★★★★</span>
                </span>
                <span className="rating-count">
                  {s.reviewCount} {copy[lang].reviews.count}
                </span>
              </div>
            </a>
          </div>
          <ReviewsMarquee>
            <div className="reviews-track">
              {[false, true].map((duplicate) => (
                <ul
                  className="reviews-group"
                  key={String(duplicate)}
                  aria-hidden={duplicate || undefined}
                >
                  {data.map((e, n) => (
                    <li className="review-card" key={e.id}>
                      <div className="review-top">
                        <div className={`avatar avatar-${n % 3}`}>
                          {e.data.author
                            .split(" ")
                            .map((w) => w[0])
                            .join("")}
                        </div>
                        <div>
                          <h3>{e.data.author}</h3>
                          <div
                            className="stars"
                            aria-label={`${e.data.rating}/5`}
                          >
                            {Array.from(
                              { length: Math.round(e.data.rating) },
                              (_, i) => (
                                <Star key={i} size={13} fill="currentColor" />
                              ),
                            )}
                          </div>
                        </div>
                        <Image
                          src="/media/google.png"
                          width={21}
                          height={21}
                          alt="Google"
                        />
                      </div>
                      <blockquote>“{e.data.excerpt}”</blockquote>
                      <a
                        href={e.data.sourceUrl}
                        {...external}
                        className="review-source"
                        tabIndex={duplicate ? -1 : undefined}
                      >
                        {copy[lang].reviews.excerpt}
                      </a>
                      {e.data.translated && (
                        <p className="translation-label">
                          {lang === "en" ? "Translated from Turkish" : "Çeviri"}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </ReviewsMarquee>
        </div>
      </section>
    );
  }
  if (b.type === "articles") {
    const all = teasers(entries, lang);
    if (b.limit)
      return (
        <section {...attr} className="section journal-teaser">
          <div className="heading-row">
            <Title block={b} />
            {b.href && (
              <Link className="text-link" href={href(b.href)}>
                {b.buttonLabel}
              </Link>
            )}
          </div>
          <div className="journal-preview-grid">
            {all.slice(0, b.limit).map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      );
    const filters = [
      { id: "all", label: lang === "tr" ? "Tüm yazılar" : "All articles" },
      ...entries
        .filter((e) => e.kind === "category")
        .map((c) => ({ id: c.data.slug || c.id, label: c.data.title })),
    ];
    return (
      <section {...attr} className="section journal-list">
        <Title block={b} />
        <ArticleList
          topicsTitle={lang === "tr" ? "Konular" : "Topics"}
          label={
            lang === "tr"
              ? "Yazıları konuya göre filtrele"
              : "Filter articles by topic"
          }
          filters={filters}
          articles={all.map((a) => ({
            ...a,
            categoryId:
              entries.find((c) => c.id === a.categoryId)?.data.slug ||
              a.categoryId,
          }))}
        />
      </section>
    );
  }
  if (b.type === "press")
    return (
      <section {...attr} className="section press-list">
        <Title block={b} />
        <PressArchive entries={entries} lang={lang} limit={b.limit} />
      </section>
    );
  if (b.type === "address")
    return (
      <section {...attr} className="section">
        <div className="visit-card">
          <div>
            <h2>{b.title}</h2>
            <address>{b.text}</address>
            <a
              className="button button-petrol"
              href={b.href || s.maps}
              {...external}
            >
              {b.buttonLabel}
            </a>
          </div>
          <div className="visit-card-aside">
            <p>{s.name}</p>
            <a href={`tel:${s.phone.replace(/[^+\d]/g, "")}`}>{s.phone}</a>
          </div>
        </div>
      </section>
    );
  return (
    <section {...attr} className="section next-step">
      <h2>
        {b.title} {b.light}
      </h2>
      {text(b.text)}
      {text(b.text2)}
      {b.href && (
        <a className="button button-petrol" href={href(b.href)}>
          {b.buttonLabel}
        </a>
      )}
    </section>
  );
}
function ArticlePage({
  entry,
  entries,
  settings: s,
  lang,
}: {
  entry: PublicEntry;
  entries: PublicEntry[];
  settings: ContentData;
  lang: Locale;
}) {
  const d = entry.data;
  return (
    <main id="main">
      <article>
        <PageHeading title={d.title} />
        <div className="section article-body-layout">
          <ArticleToc
            title={lang === "tr" ? "İçindekiler" : "Contents"}
            items={[
              ...tocItems(d.body),
              ...(d.sources.length
                ? [
                    {
                      id: "article-source",
                      label: lang === "tr" ? "Kaynaklar" : "Sources",
                    },
                  ]
                : []),
            ]}
          />
          <div className="article-body cms-rich">
            <RichText body={d.body} />
            {d.sources.length > 0 && (
              <div className="article-source" id="article-source">
                <h2>{lang === "tr" ? "Kaynaklar" : "Sources"}</h2>
                {d.sources.map((source, n) => (
                  <p key={n}>
                    <a href={source.url} {...external}>
                      {source.name}
                      <ArrowUpRight size={14} />
                    </a>
                  </p>
                ))}
              </div>
            )}
            <Link
              className="article-back-link"
              href={`/${lang}/${lang === "tr" ? "makale-kosesi" : "articles"}`}
            >
              {lang === "tr" ? "Makale Köşesi’ne dön" : "Back to articles"}
            </Link>
          </div>
          <aside className="article-sidebar">
            <div className="article-clinic-card">
              <Link className="reading-wordmark" href={`/${lang}`}>
                {s.wordmark}
                <span>{s.brandSubtitle}</span>
              </Link>
              <p>{s.footerTagline}</p>
              <p className="reading-location">{s.address}</p>
              <a className="button button-petrol" href={wa(s)} {...external}>
                {copy[lang].about.cta}
              </a>
            </div>
            <nav className="article-related-links">
              <h2>{lang === "tr" ? "İlgili sayfalar" : "Related pages"}</h2>
              {entries
                .filter((e) => ["hair", "methods", "results"].includes(e.id))
                .map((e) => (
                  <Link key={e.id} href={contentPath("page", lang, e.data)}>
                    {e.data.title} {e.data.light}
                    <ArrowUpRight size={16} />
                  </Link>
                ))}
            </nav>
          </aside>
        </div>
      </article>
      <section className="section related-reading">
        <h2>{lang === "tr" ? "Okumaya devam edin." : "Keep reading."}</h2>
        <div className="related-article-grid">
          {teasers(entries, lang)
            .filter((e) => e.id !== entry.id)
            .slice(0, 2)
            .map((a) => (
              <ArticleCard key={a.id} article={a} variant="editorial" />
            ))}
        </div>
      </section>
    </main>
  );
}
