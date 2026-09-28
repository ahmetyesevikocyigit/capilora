import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import manifest from "../content/press-clippings.json";
import { client, dataDir } from "../lib/cms/db";
import { listEntries, createEntry, getEntry, changeEntry } from "../lib/cms/store";
import { uploadMedia } from "../lib/cms/media";
import { emptyData, newBlock, type ContentData } from "../lib/cms/types";

type Ledger = { documents: Record<string, string>; assets: Record<string, string>; pageUpdated: boolean };

async function main() {
  const source = process.argv[2];
  if (!source) throw new Error("Görsellerin bulunduğu klasörü belirtin.");
  if (process.env.CMS_DATABASE_URL && !process.env.CMS_DATABASE_URL.startsWith("file:"))
    throw new Error("Bu aktarım yalnızca yerel veritabanında çalışır.");
  // Validate the complete delivery before creating records. Originals are never changed.
  for (const story of manifest) for (const file of story.files) {
    const metadata = await sharp(path.join(source, file)).metadata();
    if (metadata.format !== "jpeg") throw new Error(`JPEG bekleniyor: ${file}`);
  }
  const existing = await listEntries();
  const directory = path.join(dataDir, "imports");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const ledgerPath = path.join(directory, "press-clippings-2026-09-27.json");
  let ledger: Ledger;
  try { ledger = JSON.parse(await readFile(ledgerPath, "utf8")); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    ledger = { documents: {}, assets: {}, pageUpdated: false };
    // Content-only backup: authentication and sessions are intentionally excluded.
    await writeFile(path.join(directory, `press-before-${Date.now()}.json`),
      JSON.stringify(existing.filter(entry => entry.id === "press" || entry.kind === "press"), null, 2), { mode: 0o600 });
  }
  const checkpoint = async () => {
    await writeFile(`${ledgerPath}.tmp`, JSON.stringify(ledger, null, 2), { mode: 0o600 });
    await rename(`${ledgerPath}.tmp`, ledgerPath);
  };
  await checkpoint();

  for (const [order, story] of manifest.entries()) {
    const prior = existing.find(entry => entry.kind === "press" && entry.locale === "tr" &&
      entry.draft.publication === story.publication && entry.draft.title === story.tr);
    const id = ledger.documents[story.key] || prior?.id || await createEntry("press");
    ledger.documents[story.key] = id;
    await checkpoint();
    for (const lang of ["tr", "en"] as const) {
      const entry = await getEntry(id, lang);
      // A saved, published or deleted record belongs to its editor; repeat imports leave it alone.
      if (!entry || entry.version !== 1 || entry.deletedAt || entry.published) continue;
      const images: string[] = [];
      for (const [index, file] of story.files.entries()) {
        const key = `${story.key}-${index + 1}`;
        if (!ledger.assets[key]) {
          const form = new FormData();
          form.set("file", new File([await readFile(path.join(source, file))], `basin-${key}.jpeg`, { type: "image/jpeg" }));
          const asset = await uploadMedia(new Request("http://localhost/import", { method: "POST", body: form }));
          ledger.assets[key] = asset.url;
          await checkpoint();
          await client.execute({ sql: "UPDATE assets SET alt=? WHERE id=?", args: [`${story.publication} — ${story.tr}`, asset.id] });
        }
        images.push(ledger.assets[key]);
      }
      const gallery = newBlock("gallery");
      gallery.items = images.slice(1).map((image, i) => ({
        id: `${story.key}-${i + 2}`, image, alt: `${story.publication} — ${story[lang]}`, title: "", text: "", href: "",
      }));
      await changeEntry(id, lang, entry.version, "publish", emptyData({
        title: story[lang], publication: story.publication, image: images[0],
        alt: `${story.publication} — ${story[lang]}`, order: order + 1,
        blocks: gallery.items.length ? [gallery] : [], translated: lang === "en",
      }));
      console.log(`${story.publication} (${lang}) eklendi.`);
    }
  }

  if (!ledger.pageUpdated) {
    for (const lang of ["tr", "en"] as const) {
      const page = await getEntry("press", lang);
      if (!page || page.deletedAt) continue;
      const simplify = (data: ContentData) => ({ ...data, blocks: data.blocks.map(block =>
        block.type === "cta" && ["BASIN İLETİŞİMİ.", "PRESS ENQUIRIES."].includes(block.title)
          ? { ...block, enabled: false } : block),
      });
      // Preserve unpublished edits while simplifying the currently visible page.
      if (page.published) {
        const updated = await changeEntry(page.id, lang, page.version, "publish", simplify(page.published));
        await changeEntry(page.id, lang, updated!.version, "save", simplify(page.draft));
      } else {
        await changeEntry(page.id, lang, page.version, "save", simplify(page.draft));
      }
    }
    ledger.pageUpdated = true;
    await checkpoint();
  }
  console.log(`Aktarım tamamlandı: ${Object.keys(ledger.documents).length} haber, ${Object.keys(ledger.assets).length} WebP görsel. Yalnızca local kayıtlar güncellendi.`);
}

main().catch(error => { console.error(error instanceof Error ? error.message : "Aktarım tamamlanamadı."); process.exitCode = 1; })
  .finally(() => client.close());
