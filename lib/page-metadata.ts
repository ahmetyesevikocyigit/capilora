import type { Metadata } from "next";
import { clinic, type Locale } from "@/content/site";
import { siteUrl } from "@/content/url";
export function pageMetadata(lang: Locale, title: string, description: string, paths: Record<Locale, string>, image = "/media/team.webp", article = false): Metadata {
  return {
    metadataBase: new URL(siteUrl), title: `${title} | Capilora Hair Clinic`, description,
    alternates: { canonical: paths[lang], languages: { ...paths, "x-default": paths.tr } },
    openGraph: { title, description, url: paths[lang], type: article ? "article" : "website", siteName: clinic.name, locale: lang === "tr" ? "tr_TR" : "en_GB", images: [{ url: image }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
