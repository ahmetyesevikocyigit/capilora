import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { client, db, documents, editions } from "./db";
import { ensureSeed } from "./seed";
import { slugFromTitle } from "./content-defaults";
import {
  contentPath,
  dataSchema,
  emptyData,
  type CmsEntry,
  type ContentData,
  type Kind,
  type Locale,
  type PublicEntry,
} from "./types";
export class CmsError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function audit(event: string, id: string | null = null) {
  await client.execute({
    sql: "INSERT INTO events VALUES(?,?,?,?)",
    args: [randomUUID(), event, id, new Date().toISOString()],
  });
}
export async function listEntries(): Promise<CmsEntry[]> {
  await ensureSeed();
  const rows = await db
    .select({
      id: documents.id,
      kind: documents.kind,
      deletedAt: documents.deletedAt,
      locale: editions.locale,
      version: editions.version,
      draft: editions.draft,
      published: editions.published,
      publishedAt: editions.publishedAt,
      updatedAt: editions.updatedAt,
    })
    .from(documents)
    .innerJoin(editions, eq(documents.id, editions.documentId));
  return rows.map((r) => ({
    ...r,
    kind: r.kind as Kind,
    locale: r.locale as Locale,
    draft: dataSchema.parse(JSON.parse(r.draft)),
    published: r.published ? dataSchema.parse(JSON.parse(r.published)) : null,
  }));
}
export async function getEntry(id: string, lang: Locale) {
  return (await listEntries()).find((r) => r.id === id && r.locale === lang);
}
export async function publicEntries(
  lang: Locale,
  preview = false,
): Promise<PublicEntry[]> {
  return (await listEntries())
    .filter(
      (r) => r.locale === lang && !r.deletedAt && (preview || r.published),
    )
    .map((r) => ({
      id: r.id,
      kind: r.kind,
      locale: r.locale,
      data: preview ? r.draft : r.published!,
      updatedAt: r.publishedAt || r.updatedAt,
    }));
}
export async function createEntry(kind: Kind) {
  await ensureSeed();
  if (kind === "settings") throw new CmsError("Site ayarları zaten mevcut.");
  if (kind === "review") throw new CmsError("Google yorumları elle düzenlenmez.", 403);
  const id = randomUUID(),
    now = new Date().toISOString();
  await client.batch(
    [
      {
        sql: "INSERT INTO documents(id,kind,created_at) VALUES(?,?,?)",
        args: [id, kind, now],
      },
      ...(["tr", "en"] as const).map((lang) => ({
        sql: "INSERT INTO editions(id,document_id,locale,version,draft,updated_at) VALUES(?,?,?,1,?,?)",
        args: [`${id}:${lang}`, id, lang, JSON.stringify(emptyData()), now],
      })),
    ],
    "write",
  );
  await audit("create", id);
  return id;
}
function validatePublish(kind: Kind, id: string, data: ContentData) {
  if (!data.title.trim()) throw new CmsError("Başlık girin.");
  if (((kind === "page" && id !== "home") || kind === "article") && !data.slug)
    throw new CmsError("Sayfa adresi girin.");
  if (kind === "article" && !data.body.content?.length)
    throw new CmsError("Yazı içeriği ekleyin.");
  if (kind === "result" && (!data.before || !data.after))
    throw new CmsError("Önce ve sonra fotoğraflarını seçin.");
  if (kind === "press") {
    if (!data.publication.trim()) throw new CmsError("Yayın adı girin.");
    if (!data.image && !data.sourceUrl)
      throw new CmsError("Haber görseli veya haber bağlantısı ekleyin.");
  }
  if (kind === "review" && (!data.author || !data.excerpt || !data.sourceUrl))
    throw new CmsError("Yazar, yorum ve kaynak bağlantısı girin.");
  if (
    kind === "settings" &&
    (!data.phone || !data.whatsappNumber || !data.name)
  )
    throw new CmsError("Klinik adı, telefon ve WhatsApp numarası girin.");
}
export async function changeEntry(
  id: string,
  lang: Locale,
  version: number,
  action: string,
  input?: unknown,
  historyId?: string,
) {
  await ensureSeed();
  if (
    ![
      "save",
      "publish",
      "unpublish",
      "restoreVersion",
      "trash",
      "recover",
    ].includes(action)
  )
    throw new CmsError("Geçersiz işlem.");
  const tx = await client.transaction("write");
  try {
    const raw = (
      await tx.execute({
        sql: "SELECT e.*,d.kind,d.deleted_at FROM editions e JOIN documents d ON d.id=e.document_id WHERE document_id=? AND locale=?",
        args: [id, lang],
      })
    ).rows[0];
    if (!raw) throw new CmsError("İçerik bulunamadı.", 404);
    if (Number(raw.version) !== version)
      throw new CmsError(
        "Bu içerik başka bir sekmede değiştirildi. Değişikliklerinizi kopyalayıp güncel kaydı açın.",
        409,
      );
    const kind = raw.kind as Kind;
    if (kind === "review") throw new CmsError("Google yorumları elle düzenlenmez.", 403);
    let draft = dataSchema.parse(input ?? JSON.parse(String(raw.draft)));
    let published = raw.published
      ? (JSON.parse(String(raw.published)) as ContentData)
      : null;
    if (["save", "publish"].includes(action) && id !== "home" &&
      ["page", "article", "category"].includes(kind) && !draft.slug && draft.title.trim()) {
      const current = dataSchema.parse(JSON.parse(String(raw.draft)));
      if (current.slug || published?.slug) draft.slug = current.slug || published!.slug;
      else {
        // Reserve draft names too, so two newly created items cannot claim the same address.
        const others = (await tx.execute({
          sql: "SELECT e.draft,e.published FROM editions e JOIN documents d ON d.id=e.document_id WHERE e.locale=? AND d.kind=? AND d.id<>?",
          args: [lang, kind, id],
        })).rows;
        const taken = new Set(["admin", "api", "tr", "en", "robots", "sitemap"]);
        for (const other of others) for (const value of [other.draft, other.published]) {
          if (value) taken.add(JSON.parse(String(value)).slug);
        }
        if (kind !== "category") {
          const redirects = (await tx.execute({
            sql: "SELECT path FROM redirects WHERE locale=? AND document_id<>?",
            args: [lang, id],
          })).rows;
          const prefix = kind === "article" ? `/${lang}/${lang === "tr" ? "makale-kosesi" : "articles"}/` : `/${lang}/`;
          for (const row of redirects) {
            const path = String(row.path);
            if (path.startsWith(prefix)) taken.add(path.slice(prefix.length));
          }
        }
        draft.slug = slugFromTitle(`${draft.title} ${draft.light}`, kind, lang, taken);
      }
    }
    if (id === "home" && draft.slug !== "")
      throw new CmsError("Ana sayfanın adresi değiştirilemez.");
    if (
      id === "journal" &&
      draft.slug !== (lang === "tr" ? "makale-kosesi" : "articles")
    )
      throw new CmsError("Makale Köşesi ana adresi sabittir.");
    if (id !== "home" && draft.blocks.some((b) => b.type === "hero"))
      throw new CmsError("Video hero yalnızca ana sayfada kullanılabilir.");
    if (
      kind === "page" &&
      ["admin", "api", "tr", "en", "robots", "sitemap"].includes(draft.slug)
    )
      throw new CmsError("Bu adres ayrılmıştır.");
    if (action === "restoreVersion") {
      const old = (
        await tx.execute({
          sql: "SELECT data FROM history WHERE id=? AND document_id=? AND locale=?",
          args: [historyId || "", id, lang],
        })
      ).rows[0];
      if (!old) throw new CmsError("Sürüm bulunamadı.", 404);
      draft = dataSchema.parse(JSON.parse(String(old.data)));
    }
    if (kind === "settings") {
      const current = dataSchema.parse(JSON.parse(String(raw.draft)));
      // Navigation and the site's fixed identity are maintained with the site,
      // not through the clinic's content editing forms.
      draft.menu = current.menu;
      draft.creditLabel = current.creditLabel;
      draft.creditName = current.creditName;
      draft.creditUrl = current.creditUrl;
      draft.wordmark = current.wordmark;
      draft.brandSubtitle = current.brandSubtitle;
      draft.logo = current.logo;
      draft.headerCta = current.headerCta;
      draft.footerCta = current.footerCta;
      draft.footerRights = current.footerRights;
      draft.rating = current.rating;
      draft.reviewCount = current.reviewCount;
      draft.checkedAt = current.checkedAt;
    }
    // Resolve every media reference inside the same write transaction used to
    // save the document, so a concurrent deletion cannot leave dangling URLs.
    const mediaRefs = new Set<string>();
    const collect = (value: unknown) => {
      if (
        typeof value === "string" &&
        /^\/(api\/media\/[a-zA-Z0-9-]+|media\/[a-zA-Z0-9._-]+)$/.test(value)
      )
        mediaRefs.add(value);
      else if (value && typeof value === "object")
        Object.values(value).forEach(collect);
    };
    collect(draft);
    for (const url of mediaRefs) {
      if (
        !(
          await tx.execute({
            sql: "SELECT id FROM assets WHERE url=?",
            args: [url],
          })
        ).rows.length
      )
        throw new CmsError(
          "Seçilen medya artık mevcut değil. Kütüphaneden yeniden seçin.",
          409,
        );
    }
    const now = new Date().toISOString();
    let pubAt = raw.published_at as string | null;
    if (action === "publish") {
      if (raw.deleted_at) throw new CmsError("Önce çöp kutusundan geri alın.");
      validatePublish(kind, id, draft);
      if (kind === "page" || kind === "article") {
        const newPath = contentPath(kind, lang, draft);
        const others = (
          await tx.execute({
            sql: "SELECT d.id,d.kind,e.published FROM editions e JOIN documents d ON d.id=e.document_id WHERE locale=? AND d.id<>? AND d.deleted_at IS NULL AND e.published IS NOT NULL",
            args: [lang, id],
          })
        ).rows;
        if (
          others.some(
            (o) =>
              ["page", "article"].includes(String(o.kind)) &&
              contentPath(
                o.kind as Kind,
                lang,
                JSON.parse(String(o.published)),
              ) === newPath,
          )
        )
          throw new CmsError("Bu adres başka bir yayında kullanılıyor.", 409);
        const reserved = (
          await tx.execute({
            sql: "SELECT document_id FROM redirects WHERE path=?",
            args: [newPath],
          })
        ).rows[0];
        if (reserved && reserved.document_id !== id)
          throw new CmsError(
            "Bu adres başka bir içeriğin yönlendirmesinde kullanılıyor.",
            409,
          );
        if (published && contentPath(kind, lang, published) !== newPath)
          await tx.execute({
            sql: "INSERT OR REPLACE INTO redirects(path,document_id,locale) VALUES(?,?,?)",
            args: [contentPath(kind, lang, published), id, lang],
          });
        await tx.execute({
          sql: "DELETE FROM redirects WHERE path=? AND document_id=?",
          args: [newPath, id],
        });
      }
      published = draft;
      pubAt = now;
      await tx.execute({
        sql: "INSERT INTO history VALUES(?,?,?,?,?)",
        args: [randomUUID(), id, lang, JSON.stringify(draft), now],
      });
    }
    if (action === "unpublish") {
      if (["home", "site"].includes(id))
        throw new CmsError("Bu ortak kayıt yayından kaldırılamaz.");
      published = null;
      pubAt = null;
    }
    if (action === "trash" || action === "recover") {
      if (["home", "site", "journal"].includes(id))
        throw new CmsError("Bu temel kayıt silinemez.");
      await tx.execute({
        sql: "UPDATE documents SET deleted_at=? WHERE id=?",
        args: [action === "trash" ? now : null, id],
      });
      await tx.execute({
        sql: "UPDATE editions SET version=version+1,updated_at=? WHERE document_id=? AND locale<>?",
        args: [now, id, lang],
      });
      if (action === "recover") {
        // Recovery never silently republishes old URLs or conflicts with a
        // replacement created while this document was in the trash.
        await tx.execute({
          sql: "UPDATE editions SET published=NULL,published_at=NULL WHERE document_id=?",
          args: [id],
        });
        published = null;
        pubAt = null;
      }
    }
    await tx.execute({
      sql: "UPDATE editions SET draft=?,published=?,published_at=?,version=version+1,updated_at=? WHERE document_id=? AND locale=?",
      args: [
        JSON.stringify(draft),
        published ? JSON.stringify(published) : null,
        pubAt,
        now,
        id,
        lang,
      ],
    });
    await tx.commit();
    await audit(action, id);
    return await getEntry(id, lang);
  } catch (e) {
    await tx.rollback();
    throw e;
  } finally {
    tx.close();
  }
}
export async function history(id: string, lang: Locale) {
  await ensureSeed();
  return (
    await client.execute({
      sql: "SELECT id,created_at,data FROM history WHERE document_id=? AND locale=? ORDER BY created_at DESC",
      args: [id, lang],
    })
  ).rows.map((r) => ({
    id: String(r.id),
    createdAt: String(r.created_at),
    title: JSON.parse(String(r.data)).title,
  }));
}
export async function resolveRedirect(path: string) {
  await ensureSeed();
  const row = (
    await client.execute({
      sql: "SELECT r.*,e.published,d.kind,d.deleted_at FROM redirects r JOIN editions e ON e.document_id=r.document_id AND e.locale=r.locale JOIN documents d ON d.id=r.document_id WHERE r.path=?",
      args: [path],
    })
  ).rows[0];
  if (row?.published && !row.deleted_at)
    return contentPath(
      row.kind as Kind,
      row.locale as Locale,
      JSON.parse(String(row.published)),
    );
  return null;
}
export async function mediaUsage(url: string) {
  const rows = await listEntries();
  const revisions = (
    await client.execute("SELECT document_id,locale,data FROM history")
  ).rows;
  return rows
    .filter(
      (r) =>
        JSON.stringify(r.draft).includes(JSON.stringify(url)) ||
        (r.published &&
          JSON.stringify(r.published).includes(JSON.stringify(url))) ||
        revisions.some(
          (h) =>
            h.document_id === r.id &&
            h.locale === r.locale &&
            String(h.data).includes(JSON.stringify(url)),
        ),
    )
    .map((r) => ({
      id: r.id,
      locale: r.locale,
      title: r.draft.title,
      published:
        !r.deletedAt &&
        !!r.published &&
        JSON.stringify(r.published).includes(JSON.stringify(url)),
    }));
}
