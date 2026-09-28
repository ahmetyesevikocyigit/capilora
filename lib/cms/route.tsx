import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { siteSnapshot } from "./public";
import { resolveRedirect } from "./store";
import { contentPath } from "./types";
import { isLocale } from "@/content/site";
import { siteUrl } from "@/content/url";
import { CmsPage } from "@/components/cms-page";
import { contentMetadata } from "./content-defaults";
export async function resolvePage(lang: string, segments: string[]) {
  if (!isLocale(lang)) notFound();
  const snapshot = await siteSnapshot(lang),
    path = `/${lang}${segments.length ? "/" + segments.join("/") : ""}`;
  const entry = snapshot.entries.find(
    (e) =>
      ["page", "article"].includes(e.kind) &&
      contentPath(e.kind, lang, e.data) === path,
  );
  if (!entry) {
    const target = await resolveRedirect(path);
    if (target && target !== path) permanentRedirect(target);
    notFound();
  }
  return { lang, path, entry, ...snapshot };
}
export async function routeMetadata(
  lang: string,
  segments: string[],
): Promise<Metadata> {
  const s = await resolvePage(lang, segments),
    other = lang === "tr" ? "en" : "tr";
  const metadata = contentMetadata(s.entry.data, s.settings);
  const languages: Record<string, string> = { [lang]: s.path };
  if (s.translations[s.path]) languages[other] = s.translations[s.path];
  languages["x-default"] = languages.tr || s.path;
  return {
    metadataBase: new URL(siteUrl),
    title: metadata.title,
    description: metadata.description,
    alternates: { canonical: s.path, languages },
    robots: s.preview
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title: metadata.title,
      description: metadata.description,
      url: s.path,
      type: s.entry.kind === "article" ? "article" : "website",
      siteName: s.settings.name,
      locale: lang === "tr" ? "tr_TR" : "en_GB",
      images: metadata.image ? [{ url: metadata.image }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: metadata.title,
      description: metadata.description,
      images: metadata.image ? [metadata.image] : [],
    },
  };
}
export async function renderRoute(lang: string, segments: string[]) {
  const s = await resolvePage(lang, segments);
  const graph = [
    {
      "@type": "MedicalClinic",
      "@id": `${siteUrl}/#clinic`,
      name: s.settings.name,
      url: siteUrl,
      telephone: s.settings.phone,
      address: s.settings.address,
      sameAs: s.settings.instagram ? [s.settings.instagram] : [],
    },
    {
      "@type": s.entry.kind === "article" ? "Article" : "WebPage",
      "@id": siteUrl + s.path,
      url: siteUrl + s.path,
      headline: s.entry.data.title,
      description: contentMetadata(s.entry.data, s.settings).description,
      inLanguage: lang,
      ...(s.entry.kind === "article"
        ? {
            publisher: { "@id": `${siteUrl}/#clinic` },
            ...(s.entry.data.publishedAt
              ? { datePublished: s.entry.data.publishedAt }
              : {}),
          }
        : {}),
    },
  ];
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": graph,
          }).replace(/</g, "\\u003c"),
        }}
      />
      <CmsPage
        lang={s.lang}
        entry={s.entry}
        entries={s.entries}
        settings={s.settings}
      />
    </>
  );
}
