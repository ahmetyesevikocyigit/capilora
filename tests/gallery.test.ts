import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ContentData } from "../lib/cms/types";

let directory: string;
let database: typeof import("../lib/cms/db");
let migration: typeof import("../lib/cms/gallery-migration");
let store: typeof import("../lib/cms/store");
let types: typeof import("../lib/cms/types");
let gallery: typeof import("../lib/cms/gallery");

before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "capilora-gallery-test-"));
  process.env.CMS_DATA_DIR = directory;
  delete process.env.CMS_DATABASE_URL;
  delete process.env.CMS_DATABASE_TOKEN;
  database = await import("../lib/cms/db");
  types = await import("../lib/cms/types");
  await database.migrate();
  await database.client.execute("INSERT INTO migrations VALUES('initial-content-v1','2026-01-01')");
  for (const id of ["home", "site"]) {
    await database.client.execute({ sql: "INSERT INTO documents VALUES(?,?,?,NULL)", args: [id, id === "home" ? "page" : "settings", "2026-01-01"] });
    for (const locale of ["tr", "en"]) {
      const published = types.emptyData({
        title: "Published title", phone: "Original phone",
        blocks: [types.blockSchema.parse({ id: "existing-block", type: "reviews", title: "Existing section" })],
        menu: [{id: "clinic", label: "Existing menu", href: `/${locale}/clinic`, children: []}],
      });
      const draft = { ...published, title: "Private draft title", phone: "Unpublished phone change" };
      await database.client.execute({sql: "INSERT INTO editions VALUES(?,?,?,7,?,?,?,?)",
        args: [`${id}:${locale}`, id, locale, JSON.stringify(draft), JSON.stringify(published), "2026-01-01", "2026-01-01"]});
    }
  }
  migration = await import("../lib/cms/gallery-migration");
  gallery = await import("../lib/cms/gallery");
  store = await import("../lib/cms/store");
});

after(async () => { database?.client.close(); if (directory) await rm(directory, {recursive:true, force:true}); });

test("gallery migration preserves independent drafts, publications and existing sections", async () => {
  await migration.migrateGallery();
  const rows = (await database.client.execute("SELECT * FROM editions WHERE document_id IN ('home','site')")).rows;
  for (const row of rows) {
    const draft = JSON.parse(String(row.draft)) as ContentData;
    const published = JSON.parse(String(row.published)) as ContentData;
    assert.equal(draft.title, "Private draft title");
    assert.equal(published.title, "Published title");
    assert.equal(draft.phone, "Unpublished phone change");
    assert.equal(published.phone, "Original phone");
    assert.ok(draft.blocks.some(b => b.id === "existing-block"));
    if (row.document_id === "home") {
      assert.equal(draft.blocks[0].type, "galleryStrip");
      assert.equal(published.blocks[0].type, "galleryStrip");
    } else {
      assert.equal(draft.menu[0].label, "Existing menu");
      assert.equal(draft.menu[1].id, "gallery");
      assert.equal(published.menu[1].href, row.locale === "tr" ? "/tr/galeri" : "/en/gallery");
    }
    assert.equal(row.version, 8);
  }
  const entries = await store.listEntries();
  for (const locale of ["tr", "en"] as const) {
    const entry = entries.find(e => e.id === "gallery" && e.locale === locale)!;
    assert.ok(entry.published);
    assert.equal(entry.draft.blocks[0].items.length, 0);
    assert.equal(gallery.galleryContent(await store.publicEntries(locale))?.photos.length, 0);
  }
  const before = await database.client.execute("SELECT * FROM editions");
  await migration.migrateGallery();
  assert.deepEqual((await database.client.execute("SELECT * FROM editions")).rows, before.rows);
});

test("gallery and home feed share published photo order, visibility and language", async () => {
  for (const name of ["service-beard.webp", "service-hair.webp"]) {
    await database.client.execute({
      sql: "INSERT INTO assets(id,name,mime,size,url,created_at) VALUES(?,?,'image/webp',1,?,'2026-01-01')",
      args: [name, name, `/media/${name}`],
    });
  }
  let entry = (await store.getEntry("gallery", "tr"))!;
  const visible = types.blockSchema.parse({id: "photos", type: "gallery", items: [
    {id: "second", image: "/media/service-beard.webp", title: "Second first"},
    {id: "first", image: "/media/service-hair.webp", title: "First second"},
    {id: "empty", image: ""},
  ]});
  const hidden = { ...visible, id: "hidden", enabled: false };
  entry = (await store.changeEntry(entry.id, "tr", entry.version, "save", {...entry.draft, blocks: [visible, hidden]}))!;
  assert.equal(gallery.galleryContent(await store.publicEntries("tr"))?.photos.length, 0);
  assert.deepEqual(gallery.galleryContent(await store.publicEntries("tr", true))?.photos.map(p => p.id), ["second", "first"]);
  entry = (await store.changeEntry(entry.id, "tr", entry.version, "publish"))!;
  assert.deepEqual(gallery.galleryContent(await store.publicEntries("tr"))?.photos.map(p => p.id), ["second", "first"]);
  assert.equal(gallery.galleryContent(await store.publicEntries("en"))?.photos.length, 0);
  await store.changeEntry(entry.id, "tr", entry.version, "unpublish");
  assert.equal(gallery.galleryContent(await store.publicEntries("tr")), null);
  await migration.migrateGallery();
  assert.equal((await store.getEntry("gallery", "tr"))!.published, null);
});
