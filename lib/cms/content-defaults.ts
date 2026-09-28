import type { ContentData, Kind, Locale, RichNode } from "./types";

export function slugFromTitle(title: string, kind: Kind, lang: Locale, taken: Set<string>) {
  const fallback = kind === "article" ? (lang === "tr" ? "makale" : "article")
    : kind === "category" ? (lang === "tr" ? "konu" : "topic") : (lang === "tr" ? "sayfa" : "page");
  const base = title.toLocaleLowerCase("tr").replace(/ı/g, "i").normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-").slice(0, 140).replace(/^-+|-+$/g, "") || fallback;
  let slug = base;
  for (let number = 2; taken.has(slug); number++) slug = `${base}-${number}`;
  return slug;
}

function plainText(node: RichNode): string {
  return node.text || node.content?.map(plainText).join(" ") || "";
}

// Existing SEO overrides remain intact. New content derives metadata from its visible content.
export function contentMetadata(data: ContentData, settings: ContentData) {
  const blocks = data.blocks.filter(block => block.enabled);
  const title = [data.title, data.light].filter(Boolean).join(" ").trim();
  const description = data.excerpt || blocks.find(block => block.text.trim())?.text
    || plainText(data.body) || settings.footerTagline;
  const image = data.image || blocks.map(block => block.image || block.poster || block.items.find(item => item.image)?.image).find(Boolean) || "";
  return {
    title: data.seoTitle || [title, settings.name].filter(Boolean).join(" | "),
    description: data.seoDescription || description.replace(/\s+/g, " ").trim().slice(0, 300),
    image,
  };
}
