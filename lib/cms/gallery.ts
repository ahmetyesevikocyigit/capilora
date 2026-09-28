import { blockSchema, emptyData, type ContentData, type Locale, type PublicEntry } from "./types";

export function galleryPageData(lang: Locale): ContentData {
  return emptyData({
    title: lang === "tr" ? "Galeri" : "Gallery",
    slug: lang === "tr" ? "galeri" : "gallery",
    seoTitle: lang === "tr" ? "Galeri | Capilora Hair Clinic" : "Gallery | Capilora Hair Clinic",
    seoDescription: lang === "tr" ? "Capilora Hair Clinic fotoğraf galerisi." : "The Capilora Hair Clinic photo gallery.",
    blocks: [blockSchema.parse({ id: "gallery-photos", type: "gallery" })],
  });
}

export function galleryStripBlock(lang: Locale) {
  return blockSchema.parse({
    id: "home-gallery-strip", type: "galleryStrip", anchor: "gallery",
    title: lang === "tr" ? "Galeri" : "Gallery",
  });
}

// The caller supplies either published entries or the authenticated preview snapshot.
export function galleryContent(entries: PublicEntry[]) {
  const page = entries.find(entry => entry.id === "gallery" && entry.kind === "page");
  if (!page) return null;
  const photos = page.data.blocks
    .filter(block => block.type === "gallery" && block.enabled)
    .flatMap(block => block.items.filter(item => item.image));
  return { page, photos };
}
