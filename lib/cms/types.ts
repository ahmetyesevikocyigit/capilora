import { z } from "zod";
export const kinds = [
  "page",
  "article",
  "category",
  "press",
  "result",
  "review",
  "settings",
] as const;
export type Kind = (typeof kinds)[number];
export const kindNames: Record<Kind, string> = {
  page: "Sayfalar",
  article: "Makale Köşesi",
  category: "Konular",
  press: "Basında Biz",
  result: "Sonuçlar",
  review: "Google Yorumları",
  settings: "Klinik Bilgileri",
};
export const locales = ["tr", "en"] as const;
export type Locale = (typeof locales)[number];
export const blockNames = {
  hero: "Video hero",
  text: "Metin",
  imageText: "Görsel ve metin",
  cards: "Uygulama kartları",
  steps: "Süreç adımları",
  faq: "Sık sorulan sorular",
  gallery: "Galeri",
  galleryStrip: "Galeri şeridi",
  results: "Önce ve sonra",
  reviews: "Yorum şeridi",
  articles: "Makale listesi",
  press: "Basın listesi",
  address: "Adres",
  cta: "İletişim çağrısı",
  methods: "Uygulama bilgileri",
} as const;
export type BlockType = keyof typeof blockNames;
const short = z.string().max(500);
const text = z.string().max(30000);
export const safeUrl = z
  .string()
  .max(2000)
  .refine((v) => {
    if (!v) return true;
    if (v.includes("\\") || [...v].some((c) => c.charCodeAt(0) < 32))
      return false;
    if (/^(\/(?!\/)|#)/.test(v)) return true;
    if (/^tel:\+?[\d ]+$/.test(v) || /^mailto:[^\s@]+@[^\s@]+$/.test(v))
      return true;
    try {
      const url = new URL(v);
      return (
        ["http:", "https:"].includes(url.protocol) &&
        !!url.hostname &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, "Geçerli bir bağlantı girin.");
export const mediaUrl = z
  .string()
  .max(500)
  .refine(
    (v) =>
      !v || /^\/(media\/[a-zA-Z0-9._-]+|api\/media\/[a-zA-Z0-9-]+)$/.test(v),
    "Medya kütüphanesinden dosya seçin.",
  );
const item = z.object({
  id: short,
  title: short.default(""),
  text: text.default(""),
  image: mediaUrl.default(""),
  alt: short.default(""),
  href: safeUrl.default(""),
});
export const blockSchema = z.object({
  id: short,
  type: z.enum(Object.keys(blockNames) as [BlockType, ...BlockType[]]),
  enabled: z.boolean().default(true),
  title: short.default(""),
  light: short.default(""),
  text: text.default(""),
  text2: text.default(""),
  image: mediaUrl.default(""),
  alt: short.default(""),
  href: safeUrl.default(""),
  buttonLabel: short.default(""),
  secondaryHref: safeUrl.default(""),
  secondaryLabel: short.default(""),
  desktopVideo: mediaUrl.default(""),
  mobileVideo: mediaUrl.default(""),
  poster: mediaUrl.default(""),
  items: z.array(item).max(100).default([]),
  limit: z.number().int().min(0).max(100).default(0),
  anchor: z
    .string()
    .regex(/^[a-z0-9-]*$/)
    .default(""),
});
export type Block = z.infer<typeof blockSchema>;
export interface RichNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: RichNode[];
}
const nodeNames = new Set([
  "doc",
  "paragraph",
  "heading",
  "text",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "hardBreak",
  "horizontalRule",
  "image",
  "table",
  "tableRow",
  "tableCell",
  "tableHeader",
]);
const richChildren: Record<string, string[]> = {
  doc: [
    "paragraph",
    "heading",
    "bulletList",
    "orderedList",
    "blockquote",
    "horizontalRule",
    "image",
    "table",
  ],
  paragraph: ["text", "hardBreak"],
  heading: ["text", "hardBreak"],
  bulletList: ["listItem"],
  orderedList: ["listItem"],
  listItem: [
    "paragraph",
    "heading",
    "bulletList",
    "orderedList",
    "blockquote",
    "image",
  ],
  blockquote: ["paragraph", "heading", "bulletList", "orderedList", "image"],
  table: ["tableRow"],
  tableRow: ["tableCell", "tableHeader"],
  tableCell: [
    "paragraph",
    "heading",
    "bulletList",
    "orderedList",
    "blockquote",
    "image",
  ],
  tableHeader: [
    "paragraph",
    "heading",
    "bulletList",
    "orderedList",
    "blockquote",
    "image",
  ],
};
export function validRich(n: unknown, depth = 0): n is RichNode {
  if (!n || typeof n !== "object" || Array.isArray(n) || depth > 20)
    return false;
  const v = n as RichNode;
  if (
    !nodeNames.has(v.type) ||
    (depth === 0 && v.type !== "doc") ||
    (depth > 0 && v.type === "doc")
  )
    return false;
  if (
    v.text !== undefined &&
    (v.type !== "text" || typeof v.text !== "string" || v.text.length > 100000)
  )
    return false;
  if (v.type === "text" && typeof v.text !== "string") return false;
  if (
    v.attrs !== undefined &&
    (!v.attrs || typeof v.attrs !== "object" || Array.isArray(v.attrs))
  )
    return false;
  if (
    v.type === "image" &&
    (!v.attrs?.src || !mediaUrl.safeParse(v.attrs.src).success)
  )
    return false;
  if (v.type === "heading" && ![2, 3, 4].includes(Number(v.attrs?.level)))
    return false;
  if (
    v.marks !== undefined &&
    (!Array.isArray(v.marks) ||
      !v.marks.every(
        (m) =>
          m &&
          typeof m === "object" &&
          ["bold", "italic", "strike", "underline", "link"].includes(m.type) &&
          (m.type !== "link" ||
            (!!m.attrs?.href && safeUrl.safeParse(m.attrs.href).success)),
      ))
  )
    return false;
  if (v.content !== undefined) {
    if (
      !Array.isArray(v.content) ||
      v.content.length > 2000 ||
      !richChildren[v.type]
    )
      return false;
    if (
      !v.content.every(
        (c) => validRich(c, depth + 1) && richChildren[v.type].includes(c.type),
      )
    )
      return false;
  }
  if (
    ["table", "tableRow", "bulletList", "orderedList", "listItem"].includes(
      v.type,
    ) &&
    !v.content?.length
  )
    return false;
  return true;
}

const menuItem = z.object({
  id: short,
  label: short,
  href: safeUrl,
  children: z
    .array(z.object({ id: short, label: short, href: safeUrl }))
    .max(20)
    .default([]),
});
export const dataSchema = z.object({
  title: short.default(""),
  light: short.default(""),
  slug: z
    .string()
    .max(150)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$|^$/,
      "Adres yalnızca küçük harf, sayı ve tire içerebilir.",
    )
    .default(""),
  excerpt: text.default(""),
  seoTitle: short.default(""),
  seoDescription: z.string().max(1000).default(""),
  image: mediaUrl.default(""),
  alt: short.default(""),
  categoryId: short.default(""),
  body: z
    .custom<RichNode>(validRich, "Yazı biçimi desteklenmiyor.")
    .default({ type: "doc", content: [] }),
  sources: z
    .array(z.object({ name: short, url: safeUrl }))
    .max(50)
    .default([]),
  blocks: z.array(blockSchema).max(80).default([]),
  author: short.default(""),
  rating: z.number().min(0).max(5).default(5),
  reviewCount: z.number().int().min(0).default(0),
  sourceUrl: safeUrl.default(""),
  checkedAt: short.default(""),
  publishedAt: short.default(""),
  publication: short.default(""),
  before: mediaUrl.default(""),
  after: mediaUrl.default(""),
  beforePosition: z
    .string()
    .regex(/^\d{1,3}% \d{1,3}%$/)
    .default("50% 50%"),
  afterPosition: z
    .string()
    .regex(/^\d{1,3}% \d{1,3}%$/)
    .default("50% 50%"),
  order: z.number().int().default(0),
  translated: z.boolean().default(false),
  name: short.default(""),
  phone: short.default(""),
  whatsappNumber: z.string().regex(/^\d*$/).default(""),
  whatsappText: short.default(""),
  address: text.default(""),
  instagram: safeUrl.default(""),
  maps: safeUrl.default(""),
  logo: mediaUrl.default(""),
  wordmark: short.default(""),
  brandSubtitle: short.default(""),
  headerCta: short.default(""),
  footerTitle: short.default(""),
  footerLight: short.default(""),
  footerBody: text.default(""),
  footerCta: short.default(""),
  footerTagline: short.default(""),
  footerRights: short.default(""),
  creditLabel: short.default(""),
  creditName: short.default(""),
  creditUrl: safeUrl.default(""),
  menu: z.array(menuItem).max(30).default([]),
});
export type ContentData = z.infer<typeof dataSchema>;
export interface CmsEntry {
  id: string;
  kind: Kind;
  locale: Locale;
  version: number;
  draft: ContentData;
  published: ContentData | null;
  publishedAt: string | null;
  updatedAt: string;
  deletedAt: string | null;
}
export interface PublicEntry {
  id: string;
  kind: Kind;
  locale: Locale;
  data: ContentData;
  updatedAt: string;
}
export function emptyData(values: Partial<ContentData> = {}): ContentData {
  return dataSchema.parse(values);
}
export function newBlock(type: BlockType): Block {
  return blockSchema.parse({ id: crypto.randomUUID(), type });
}
export function contentPath(
  kind: Kind,
  lang: Locale,
  data: ContentData,
): string {
  return kind === "article"
    ? `/${lang}/${lang === "tr" ? "makale-kosesi" : "articles"}/${data.slug}`
    : `/${lang}${data.slug ? "/" + data.slug : ""}`;
}
export function wa(data: ContentData) {
  return `https://wa.me/${data.whatsappNumber}?text=${encodeURIComponent(data.whatsappText)}`;
}
