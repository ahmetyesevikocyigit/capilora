import { randomUUID } from "node:crypto";
import { client } from "./db";
import { galleryPageData, galleryStripBlock } from "./gallery";
import type { ContentData, Locale } from "./types";

// Add the gallery once, preserving each existing draft and published edition separately.
export async function migrateGallery() {
  const tx = await client.transaction("write");
  try {
    if ((await tx.execute("SELECT name FROM migrations WHERE name='gallery-page-v1'")).rows.length) {
      await tx.commit();
      return;
    }
    const now = new Date().toISOString();
    await tx.execute({
      sql: "INSERT OR IGNORE INTO documents(id,kind,created_at) VALUES('gallery','page',?)",
      args: [now],
    });
    for (const lang of ["tr", "en"] as const) {
      const data = galleryPageData(lang);
      const conflict = (await tx.execute({
        sql: "SELECT e.document_id FROM editions e JOIN documents d ON e.document_id=d.id WHERE d.kind='page' AND e.document_id<>'gallery' AND e.locale=? AND json_extract(e.published,'$.slug')=?",
        args: [lang, data.slug],
      })).rows.length;
      if (conflict) throw new Error(`Gallery URL already belongs to another page (${lang}).`);
      await tx.execute({
        sql: "INSERT OR IGNORE INTO editions(id,document_id,locale,version,draft,published,published_at,updated_at) VALUES(?,'gallery',?,1,?,?,?,?)",
        args: [`gallery:${lang}`, lang, JSON.stringify(data), JSON.stringify(data), now, now],
      });
    }
    const rows = (await tx.execute("SELECT * FROM editions WHERE document_id IN ('home','site')")).rows;
    for (const row of rows) {
      const lang = row.locale as Locale;
      const patch = (json: string) => {
        const data = JSON.parse(json) as ContentData;
        if (row.document_id === "home" && !data.blocks.some(b => b.type === "galleryStrip")) {
          const index = data.blocks.findIndex(b => b.type === "reviews");
          data.blocks.splice(index < 0 ? data.blocks.length : index, 0, galleryStripBlock(lang));
        }
        if (row.document_id === "site" && !data.menu.some(item => item.id === "gallery")) {
          const index = data.menu.findIndex(item => item.id === "clinic");
          data.menu.splice(index < 0 ? data.menu.length : index + 1, 0, {
            id: "gallery", label: lang === "tr" ? "Galeri" : "Gallery",
            href: lang === "tr" ? "/tr/galeri" : "/en/gallery", children: [],
          });
        }
        return JSON.stringify(data);
      };
      const draft = patch(String(row.draft));
      const published = row.published ? patch(String(row.published)) : null;
      if (draft === row.draft && published === row.published) continue;
      if (row.published && published !== row.published) {
        for (const json of [String(row.published), published!]) {
          await tx.execute({sql: "INSERT INTO history VALUES(?,?,?,?,?)",
            args: [randomUUID(), row.document_id, lang, json, now]});
        }
      }
      await tx.execute({
        sql: "UPDATE editions SET draft=?,published=?,version=version+1,updated_at=?,published_at=? WHERE id=?",
        args: [draft, published, now, published !== row.published ? now : row.published_at, row.id],
      });
    }
    await tx.execute({ sql: "INSERT INTO migrations VALUES('gallery-page-v1',?)", args: [now] });
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally {
    tx.close();
  }
}
