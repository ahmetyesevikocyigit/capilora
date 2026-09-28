import type { Locale } from "./site";

export const routes = {
  home: { tr: "", en: "" },
  treatments: { tr: "uygulamalar", en: "treatments" },
  hair: { tr: "sac-ekimi", en: "hair-transplant" },
  beard: { tr: "sakal-ekimi", en: "beard-transplant" },
  eyebrow: { tr: "kas-ekimi", en: "eyebrow-transplant" },
  methods: { tr: "fue-dhi-prp", en: "fue-dhi-prp" },
  results: { tr: "sonuclarimiz", en: "results" },
  clinic: { tr: "klinigimiz", en: "our-clinic" },
  gallery: { tr: "galeri", en: "gallery" },
  journal: { tr: "makale-kosesi", en: "articles" },
  press: { tr: "basinda-biz", en: "in-the-press" },
} as const;
export type PageKey = keyof typeof routes;
export const pageKeys = Object.keys(routes) as PageKey[];
export const treatmentKeys = ["hair", "beard", "eyebrow"] as const;
export const navKeys = ["treatments", "results", "clinic", "gallery", "journal", "press"] as const;
export const routeNames: Record<Locale, Record<PageKey, string>> = {
  tr: { home: "Ana sayfa", treatments: "Uygulamalar", hair: "Saç Ekimi", beard: "Sakal Ekimi", eyebrow: "Kaş Ekimi", methods: "FUE, DHI ve PRP", results: "Sonuçlarımız", clinic: "Kliniğimiz", gallery: "Galeri", journal: "Makale Köşesi", press: "Basında Biz" },
  en: { home: "Home", treatments: "Treatments", hair: "Hair Transplant", beard: "Beard Transplant", eyebrow: "Eyebrow Transplant", methods: "FUE, DHI and PRP", results: "Our results", clinic: "Our clinic", gallery: "Gallery", journal: "Articles", press: "In the press" },
};
export function pagePath(lang: Locale, key: PageKey) { return `/${lang}${routes[key][lang] ? `/${routes[key][lang]}` : ""}`; }
export function pageForSlug(lang: Locale, slug: string) { return pageKeys.find(key => routes[key][lang] === slug); }

// Shared here so the menu can switch article language without bundling article bodies.
export const articleSlugs = {
  consultation: { tr: "ilk-gorusmeye-hazirlik", en: "preparing-for-your-consultation" },
  planning: { tr: "sac-ekiminde-kisisel-planlama", en: "planning-a-hair-transplant" },
  followup: { tr: "sac-ekimi-sonrasi-takip", en: "follow-up-after-a-hair-transplant" },
} as const;
export type ArticleKey = keyof typeof articleSlugs;
export const articleKeys = Object.keys(articleSlugs) as ArticleKey[];
export function articlePath(lang: Locale, key: ArticleKey) { return `${pagePath(lang, "journal")}/${articleSlugs[key][lang]}`; }
export function translatedPath(pathname: string, lang: Locale) {
  const other: Locale = lang === "tr" ? "en" : "tr";
  const [, , slug = "", article] = pathname.split("/");
  const key = pageForSlug(lang, slug);
  if (!key) return pagePath(other, "home");
  if (key === "journal" && article) {
    const articleKey = articleKeys.find(id => articleSlugs[id][lang] === article);
    if (articleKey) return articlePath(other, articleKey);
  }
  return pagePath(other, key);
}
