import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { contentMetadata } from "../lib/cms/content-defaults";
import type { CmsEntry, ContentData } from "../lib/cms/types";

let store: typeof import("../lib/cms/store");
let database: typeof import("../lib/cms/db");
let media: typeof import("../lib/cms/media");
let types: typeof import("../lib/cms/types");
let directory: string;

before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "capilora-cms-test-"));
  process.env.CMS_DATA_DIR = directory;
  delete process.env.CMS_DATABASE_URL;
  delete process.env.CMS_DATABASE_TOKEN;
  database = await import("../lib/cms/db");
  await database.migrate();
  // Tests use generated fixtures only; do not import the clinic's existing records.
  await database.client.execute({
    sql: "INSERT INTO migrations VALUES(?,?)",
    args: ["initial-content-v1", new Date().toISOString()],
  });
  store = await import("../lib/cms/store");
  media = await import("../lib/cms/media");
  types = await import("../lib/cms/types");
});

after(async () => {
  database?.client.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});

async function page(values: Partial<ContentData> = {}): Promise<CmsEntry> {
  const id = await store.createEntry("page");
  const initial = (await store.getEntry(id, "tr"))!;
  return (await store.changeEntry(
    id,
    "tr",
    initial.version,
    "save",
    types.emptyData({ title: "Test page", slug: `test-${id}`, ...values }),
  ))!;
}

test("press clippings publish without invented dates or links, and preserve draft privacy", async () => {
  const jpeg = await sharp({ create: { width: 30, height: 40, channels: 3, background: "white" } }).jpeg().toBuffer();
  const cover = await media.uploadMedia(uploadRequest(jpeg, "press-cover.jpeg", "image/jpeg"));
  const second = await media.uploadMedia(uploadRequest(jpeg, "press-second.jpeg", "image/jpeg"));
  assert.equal(cover.mime, "image/webp");
  const id = await store.createEntry("press");
  let entry = (await store.getEntry(id, "tr"))!;
  const gallery = types.newBlock("gallery");
  gallery.items = [{ id: "second", image: second.url, alt: "Second clipping", title: "", text: "", href: "" }];
  entry = (await store.changeEntry(id, "tr", entry.version, "save", types.emptyData({
    title: "Test clipping", publication: "Test publication", image: cover.url, blocks: [gallery],
  })))!;
  assert.equal((await store.mediaUsage(second.url)).some(item => item.published), false);
  assert.equal((await store.publicEntries("tr")).some(item => item.id === id), false);
  entry = (await store.changeEntry(id, "tr", entry.version, "publish"))!;
  assert.equal(entry.published!.sourceUrl, "");
  assert.equal(entry.published!.publishedAt, "");
  assert.equal((await store.publicEntries("en")).some(item => item.id === id), false);
  assert.equal((await store.mediaUsage(second.url)).some(item => item.published), true);
  await assert.rejects(media.deleteMedia(second.id), { status: 409 });
  await store.changeEntry(id, "tr", entry.version, "save", { ...entry.draft, title: "Unpublished revision" });
  assert.equal((await store.publicEntries("tr")).find(item => item.id === id)!.data.title, "Test clipping");
});

test("press publication requires a publication name and either an image or a source", async () => {
  const id = await store.createEntry("press");
  const entry = (await store.getEntry(id, "tr"))!;
  await assert.rejects(store.changeEntry(id, "tr", entry.version, "publish", types.emptyData({
    title: "Test", publication: "   ", sourceUrl: "https://example.com/news",
  })), /Yayın adı/);
  await assert.rejects(store.changeEntry(id, "tr", entry.version, "publish", types.emptyData({
    title: "Test", publication: "Test publication",
  })), /Haber görseli veya haber bağlantısı/);
  const published = await store.changeEntry(id, "tr", entry.version, "publish", types.emptyData({
    title: "Test", publication: "Test publication", sourceUrl: "https://example.com/news",
  }));
  assert.equal(published!.published!.sourceUrl, "https://example.com/news");
});

test("saving a draft never changes the public record or publishes another language", async () => {
  let entry = await page();
  assert.equal(
    (await store.publicEntries("tr")).some((e) => e.id === entry.id),
    false,
  );
  entry = (await store.changeEntry(entry.id, "tr", entry.version, "publish"))!;
  const publishedTitle = entry.published!.title;
  await store.changeEntry(entry.id, "tr", entry.version, "save", {
    ...entry.draft,
    title: "Private draft",
  });
  assert.equal(
    (await store.publicEntries("tr")).find((e) => e.id === entry.id)!.data
      .title,
    publishedTitle,
  );
  assert.equal(
    (await store.publicEntries("tr", true)).find((e) => e.id === entry.id)!.data
      .title,
    "Private draft",
  );
  assert.equal(
    (await store.publicEntries("en")).some((e) => e.id === entry.id),
    false,
  );
});

test("stale updates are rejected without overwriting newer drafts", async () => {
  const entry = await page();
  await store.changeEntry(entry.id, "tr", entry.version, "save", {
    ...entry.draft,
    title: "First saved",
  });
  await assert.rejects(
    store.changeEntry(entry.id, "tr", entry.version, "save", {
      ...entry.draft,
      title: "Stale overwrite",
    }),
    { status: 409 },
  );
  assert.equal(
    (await store.getEntry(entry.id, "tr"))!.draft.title,
    "First saved",
  );
});

test("old slugs redirect straight to the latest address and stay reserved", async () => {
  let entry = await page();
  entry = (await store.changeEntry(entry.id, "tr", entry.version, "publish"))!;
  const original = types.contentPath("page", "tr", entry.published!);
  const oldSlug = entry.published!.slug;
  entry = (await store.changeEntry(entry.id, "tr", entry.version, "publish", {
    ...entry.draft,
    slug: `next-${entry.id}`,
  }))!;
  entry = (await store.changeEntry(entry.id, "tr", entry.version, "publish", {
    ...entry.draft,
    slug: `last-${entry.id}`,
  }))!;
  assert.equal(await store.resolveRedirect(original), `/tr/last-${entry.id}`);
  const conflicting = await page({ slug: oldSlug });
  await assert.rejects(
    store.changeEntry(conflicting.id, "tr", conflicting.version, "publish"),
    { status: 409 },
  );
  await store.changeEntry(entry.id, "tr", entry.version, "unpublish");
  assert.equal(await store.resolveRedirect(original), null);
});

test("duplicate published URLs are rejected while another record can retain a draft", async () => {
  const first = await page();
  await store.changeEntry(first.id, "tr", first.version, "publish");
  const second = await page({ slug: first.draft.slug });
  await assert.rejects(
    store.changeEntry(second.id, "tr", second.version, "publish"),
    { status: 409 },
  );
  assert.equal((await store.getEntry(second.id, "tr"))!.published, null);
});

test("new content gets unique addresses automatically while saved addresses stay stable", async () => {
  let first = await page({ title: "İlk Görüşme: Saç ve Kaş", slug: "" });
  assert.equal(first.draft.slug, "ilk-gorusme-sac-ve-kas");
  const second = await page({ title: first.draft.title, slug: "" });
  assert.equal(second.draft.slug, "ilk-gorusme-sac-ve-kas-2");
  first = (await store.changeEntry(first.id, "tr", first.version, "publish"))!;
  first = (await store.changeEntry(first.id, "tr", first.version, "save", { ...first.draft, title: "Yeni başlık" }))!;
  assert.equal(first.draft.slug, "ilk-gorusme-sac-ve-kas");
  first = (await store.changeEntry(first.id, "tr", first.version, "publish", { ...first.draft, slug: "degisen-adres" }))!;
  const third = await page({ title: "İlk Görüşme: Saç ve Kaş", slug: "" });
  assert.equal(third.draft.slug, "ilk-gorusme-sac-ve-kas-3");
  assert.equal((await page({ title: "Admin", slug: "" })).draft.slug, "admin-2");
  assert.ok((await page({ title: "🌿", slug: "" })).draft.slug);
  const english = (await store.getEntry(first.id, "en"))!;
  const translated = (await store.changeEntry(first.id, "en", english.version, "save", types.emptyData({ title: "Your first visit" })))!;
  assert.equal(translated.draft.slug, "your-first-visit");
});

test("article and topic creation need no address field; metadata uses visible content and keeps existing overrides", async () => {
  for (const kind of ["article", "category"] as const) {
    const id = await store.createEntry(kind);
    const entry = (await store.getEntry(id, "tr"))!;
    const saved = (await store.changeEntry(id, "tr", entry.version, "publish", types.emptyData({
      title: "Saç Bakımı", body: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "İçerik metni." }] }] },
    })))!;
    assert.equal(saved.published!.slug, "sac-bakimi");
  }
  const settings = types.emptyData({ name: "Capilora", footerTagline: "Klinik tanıtımı" });
  const content = types.emptyData({ title: "Yeni sayfa", blocks: [
    types.blockSchema.parse({ id: "hidden", type: "imageText", enabled: false, text: "Gizli metin", image: "/media/hidden.webp" }),
    types.blockSchema.parse({ id: "visible", type: "imageText", text: "Sayfanın metni.", image: "/media/photo.webp" }),
  ] });
  assert.deepEqual(contentMetadata(content, settings), {
    title: "Yeni sayfa | Capilora", description: "Sayfanın metni.", image: "/media/photo.webp",
  });
  assert.deepEqual(contentMetadata({ ...content, seoTitle: "Özel başlık", seoDescription: "Özel açıklama", image: "/media/cover.webp" }, settings), {
    title: "Özel başlık", description: "Özel açıklama", image: "/media/cover.webp",
  });
});

test("restoring a historical version only changes the draft until republished", async () => {
  let entry = await page({ title: "First edition" });
  entry = (await store.changeEntry(entry.id, "tr", entry.version, "publish"))!;
  const first = (await store.history(entry.id, "tr"))[0];
  entry = (await store.changeEntry(entry.id, "tr", entry.version, "publish", {
    ...entry.draft,
    title: "Second edition",
  }))!;
  entry = (await store.changeEntry(
    entry.id,
    "tr",
    entry.version,
    "restoreVersion",
    undefined,
    first.id,
  ))!;
  assert.equal(entry.draft.title, "First edition");
  assert.equal(entry.published!.title, "Second edition");
});

test("trashing a record removes every language from public reads", async () => {
  let entry = await page();
  entry = (await store.changeEntry(entry.id, "tr", entry.version, "publish"))!;
  const english = (await store.getEntry(entry.id, "en"))!;
  await store.changeEntry(entry.id, "en", english.version, "publish", {
    ...entry.draft,
    title: "English title",
  });
  await store.changeEntry(entry.id, "tr", entry.version, "trash");
  assert.equal(
    (await store.publicEntries("tr")).some((e) => e.id === entry.id),
    false,
  );
  assert.equal(
    (await store.publicEntries("en")).some((e) => e.id === entry.id),
    false,
  );
});

test("document-wide trash changes invalidate stale versions in the other language", async () => {
  const entry = await page();
  const staleEnglish = (await store.getEntry(entry.id, "en"))!;
  await store.changeEntry(entry.id, "tr", entry.version, "trash");
  await assert.rejects(
    store.changeEntry(entry.id, "en", staleEnglish.version, "recover"),
    { status: 409 },
  );
});

test("media remains protected when only a recoverable published revision references it", async () => {
  const assetId = randomUUID();
  const filename = `${assetId}.png`;
  const url = `/api/media/${assetId}`;
  await mkdir(media.uploadDir, { recursive: true });
  await writeFile(path.join(media.uploadDir, filename), "fixture image bytes");
  await database.client.execute({
    sql: "INSERT INTO assets(id,name,mime,size,url,filename,created_at) VALUES(?,?,?,?,?,?,?)",
    args: [
      assetId,
      filename,
      "image/png",
      19,
      url,
      filename,
      new Date().toISOString(),
    ],
  });
  let entry = await page({ image: url });
  entry = (await store.changeEntry(entry.id, "tr", entry.version, "publish"))!;
  await store.changeEntry(entry.id, "tr", entry.version, "publish", {
    ...entry.draft,
    image: "",
  });
  await assert.rejects(media.deleteMedia(assetId), { status: 409 });
});

test("published media access only becomes available when it is in published content", async () => {
  const assetId = randomUUID();
  const url = `/api/media/${assetId}`;
  await database.client.execute({
    sql: "INSERT INTO assets(id,name,mime,size,url,filename,created_at) VALUES(?,?,?,?,?,?,?)",
    args: [
      assetId,
      `${assetId}.png`,
      "image/png",
      19,
      url,
      `${assetId}.png`,
      new Date().toISOString(),
    ],
  });
  let entry = await page({ image: url });
  assert.equal(
    (await store.mediaUsage(url)).some((u) => u.published),
    false,
  );
  entry = (await store.changeEntry(entry.id, "tr", entry.version, "publish"))!;
  assert.equal(
    (await store.mediaUsage(url)).some((u) => u.published),
    true,
  );
  await store.changeEntry(entry.id, "tr", entry.version, "trash");
  assert.equal(
    (await store.mediaUsage(url)).some((u) => u.published),
    false,
  );
});

test("recovering a translated page returns drafts without reclaiming another published URL", async () => {
  let original = await page();
  original = (await store.changeEntry(
    original.id,
    "tr",
    original.version,
    "publish",
  ))!;
  const originalEnglish = (await store.getEntry(original.id, "en"))!;
  const sharedSlug = `english-${original.id}`;
  await store.changeEntry(
    original.id,
    "en",
    originalEnglish.version,
    "publish",
    { ...original.draft, slug: sharedSlug },
  );
  original = (await store.changeEntry(
    original.id,
    "tr",
    original.version,
    "trash",
  ))!;
  const replacement = await page();
  const replacementEnglish = (await store.getEntry(replacement.id, "en"))!;
  await store.changeEntry(
    replacement.id,
    "en",
    replacementEnglish.version,
    "publish",
    { ...replacement.draft, slug: sharedSlug },
  );
  const recovered = (await store.changeEntry(
    original.id,
    "tr",
    original.version,
    "recover",
  ))!;
  const recoveredEnglish = (await store.getEntry(original.id, "en"))!;
  assert.equal(recovered.deletedAt, null);
  assert.equal(recovered.published, null);
  assert.equal(recoveredEnglish.published, null);
  await assert.rejects(
    store.changeEntry(original.id, "en", recoveredEnglish.version, "publish"),
    { status: 409 },
  );
  assert.equal(
    (await store.publicEntries("en")).filter(
      (e) => e.kind === "page" && e.data.slug === sharedSlug,
    ).length,
    1,
  );
});

test("links reject active-content schemes and malformed HTTP destinations", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,hello",
    "https://",
    "https://site.test\n/path",
    "/\\outside.test",
  ]) {
    assert.equal(types.safeUrl.safeParse(url).success, false, url);
  }
  for (const url of [
    "https://example.test/path?q=test",
    "/tr/makale-kosesi",
    "#section-1",
    "tel:+905335695670",
    "mailto:example@example.test",
  ]) {
    assert.equal(types.safeUrl.safeParse(url).success, true, url);
  }
});

test("malformed rich-text structures produce validation failures, never exceptions", () => {
  const invalid = [
    {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "a", marks: [null] }],
        },
      ],
    },
    { type: "doc", content: false },
    { type: "doc", content: [{ type: "image", attrs: { src: "" } }] },
    {
      type: "doc",
      content: [
        {
          type: "tableRow",
          content: [{ type: "text", text: "outside table" }],
        },
      ],
    },
    { type: "paragraph", content: [{ type: "text", text: "invalid root" }] },
  ];
  for (const body of invalid) {
    assert.doesNotThrow(() => types.dataSchema.safeParse({ body }));
    assert.equal(
      types.dataSchema.safeParse({ body }).success,
      false,
      JSON.stringify(body),
    );
  }
  assert.equal(
    types.dataSchema.safeParse({
      body: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Heading" }],
          },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Bold", marks: [{ type: "bold" }] },
            ],
          },
        ],
      },
    }).success,
    true,
  );
});

function uploadRequest(bytes: Uint8Array, name: string, mime: string) {
  const form = new FormData();
  form.set("file", new File([new Uint8Array(bytes)], name, { type: mime }));
  return new Request("http://localhost/api/admin/media", {
    method: "POST",
    body: form,
  });
}

test("uploaded media validates image bytes, enforces size limits, and deletes unused files", async () => {
  const png = await sharp({ create: { width: 12, height: 8, channels: 4, background: "#123c4380" } }).png().toBuffer();
  await assert.rejects(
    media.uploadMedia(
      uploadRequest(Buffer.from("<svg></svg>"), "fake.png", "image/png"),
    ),
    { status: 400 },
  );
  await assert.rejects(
    media.uploadMedia(uploadRequest(png, "unsupported.svg", "image/svg+xml")),
    { status: 400 },
  );
  await assert.rejects(
    media.uploadMedia(
      uploadRequest(
        new Uint8Array(20 * 1024 * 1024 + 1),
        "large.png",
        "image/png",
      ),
    ),
    { status: 413 },
  );
  const uploaded = await media.uploadMedia(
    uploadRequest(png, "fixture.png", "image/png"),
  );
  assert.match(uploaded.url, /^\/api\/media\/[a-f0-9-]+$/);
  const record = (await media.listMedia()).find((a) => a.id === uploaded.id)!;
  assert.equal(uploaded.name, "fixture.webp");
  assert.equal(record.mime, "image/webp");
  const saved = await media.assetBytes(record);
  assert.equal((await sharp(saved).metadata()).format, "webp");
  assert.equal(uploaded.size, saved.length);
  assert.equal(record.size, saved.length);
  await media.deleteMedia(uploaded.id);
  assert.equal(
    (await media.listMedia()).some((a) => a.id === uploaded.id),
    false,
  );
});
