import { cache } from "react";
import { unstable_cache } from "next/cache";
import { isPreview } from "./auth";
import { publicEntries } from "./store";
import { contentPath, type Locale } from "./types";
const published = unstable_cache(
  async (lang: Locale) => publicEntries(lang),
  ["capilora-published-v2",process.env.CMS_DATA_DIR||"default"],
  { revalidate: 60, tags: ["cms"] },
);
export const siteSnapshot = cache(async (lang: Locale) => {
  const preview = await isPreview();
  const entries = preview
    ? await publicEntries(lang, true)
    : await published(lang);
  const other = lang === "tr" ? "en" : "tr";
  const otherEntries = preview
    ? await publicEntries(other, true)
    : await published(other);
  const settings = entries.find((e) => e.id === "site")!.data;
  const translations: Record<string, string> = {};
  for (const e of entries.filter(
    (e) => e.kind === "page" || e.kind === "article",
  )) {
    const match = otherEntries.find((o) => o.id === e.id);
    if (match)
      translations[contentPath(e.kind, lang, e.data)] = contentPath(
        match.kind,
        other,
        match.data,
      );
  }
  const gallery = entries.find(e => e.id === "gallery" && e.kind === "page");
  const menu = settings.menu
    .map(item => item.id === "gallery" && gallery ? { ...item, href: contentPath("page", lang, gallery.data) } : item)
    .filter(
      (item) =>
        !item.href.startsWith(`/${lang}/`) ||
        entries.some(
          (e) =>
            ["page", "article"].includes(e.kind) &&
            contentPath(e.kind, lang, e.data) === item.href,
        ),
    )
    .map((item) => ({
      ...item,
      children: item.children.filter((c) =>
        entries.some(
          (e) =>
            ["page", "article"].includes(e.kind) &&
            contentPath(e.kind, lang, e.data) === c.href,
        ),
      ),
    }));
  return { entries, settings: { ...settings, menu }, translations, preview };
});
