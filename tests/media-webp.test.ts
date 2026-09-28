import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { imageToWebp, uploadName } from "../lib/cms/image-upload";

let database: typeof import("../lib/cms/db");
let media: typeof import("../lib/cms/media");
let directory: string;
before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "capilora-webp-"));
  process.env.CMS_DATA_DIR = directory;
  delete process.env.CMS_DATABASE_URL;
  delete process.env.CMS_DATABASE_TOKEN;
  database = await import("../lib/cms/db");
  await database.migrate();
  media = await import("../lib/cms/media");
});
after(async () => {
  database?.client.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});

const picture = () => sharp({ create: { width: 24, height: 16, channels: 4, background: { r: 20, g: 100, b: 90, alpha: 0.5 } } });
function request(bytes: Uint8Array, name: string, mime: string) {
  const form = new FormData();
  form.set("file", new File([new Uint8Array(bytes)], name, { type: mime }));
  return new Request("http://localhost/api/admin/media", { method: "POST", body: form });
}

test("all accepted photo formats are stored as decoded WebP with accurate names, dimensions and sizes", async () => {
  for (const format of ["jpeg", "png", "webp", "avif"] as const) {
    const original = await picture().toFormat(format).toBuffer();
    const asset = await media.uploadMedia(request(original, `C:\\photos\\klinik.${format}`, `image/${format}`));
    const record = (await database.client.execute({ sql: "SELECT * FROM assets WHERE id=?", args: [asset.id] })).rows[0];
    const bytes = await media.assetBytes(record);
    const metadata = await sharp(bytes).metadata();
    assert.equal(asset.name, "klinik.webp");
    assert.equal(record.name, asset.name);
    assert.equal(record.mime, "image/webp");
    assert.equal(asset.mime, record.mime);
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, 24);
    assert.equal(metadata.height, 16);
    assert.equal(asset.size, bytes.length);
    assert.equal(record.size, bytes.length);
    assert.match(String(record.filename), /\.webp$/);
    if (format !== "jpeg") {
      assert.equal(metadata.hasAlpha, true);
      const { data, info } = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
      assert.ok(Math.abs(data[info.channels - 1] - 128) <= 1);
    }
  }
  assert.equal(uploadName("foto.name.JPG", "webp"), "foto.name.webp");
  assert.equal(uploadName("x".repeat(250) + ".png", "webp").length, 200);
});

test("phone orientation and animated WebP frames survive conversion; corrupt or mislabeled photos are rejected", async () => {
  const rotated = await picture().jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const output = await imageToWebp(rotated, "image/jpeg");
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.width, 16);
  assert.equal(metadata.height, 24);
  assert.equal(metadata.orientation, undefined);

  const pixels = Buffer.concat([Buffer.alloc(8 * 8 * 3, 80), Buffer.alloc(8 * 8 * 3, 220)]);
  const animated = await sharp(pixels, { raw: { width: 8, height: 16, channels: 3, pageHeight: 8 } })
    .webp({ loop: 0, delay: [100, 200] }).toBuffer();
  const frames = await sharp(await imageToWebp(animated, "image/webp"), { animated: true }).metadata();
  assert.equal(frames.pages, 2);
  assert.equal(frames.pageHeight, 8);
  assert.deepEqual(frames.delay, [100, 200]);
  const png = await picture().png().toBuffer();
  const filesBefore = await readdir(media.uploadDir);
  await assert.rejects(media.uploadMedia(request(png, "fake.jpg", "image/jpeg")), { status: 400 });
  await assert.rejects(media.uploadMedia(request(png.subarray(0, 65), "broken.png", "image/png")), { status: 400 });
  assert.deepEqual(await readdir(media.uploadDir), filesBefore);
});

test("existing conversion preserves IDs, references, source and history, backs up originals, and is repeatable", async () => {
  const original = await picture().png().toBuffer();
  await mkdir(media.uploadDir, { recursive: true });
  await writeFile(path.join(media.uploadDir, "legacy.png"), original);
  await database.client.execute({
    sql: "INSERT INTO assets(id,name,mime,size,url,filename,alt,source_url,created_at,version) VALUES(?,?,?,?,?,?,?,?,?,?)",
    args: ["legacy", "klinik.png", "image/png", original.length, "/api/media/legacy", "legacy.png", "Klinik", "https://example.com/source", "2026-01-01", 4],
  });
  await database.client.execute("INSERT INTO documents(id,kind,created_at) VALUES('page','page','2026-01-01')");
  const content = JSON.stringify({ image: "/api/media/legacy" });
  await database.client.execute({
    sql: "INSERT INTO editions(id,document_id,locale,draft,published,updated_at) VALUES('edition','page','tr',?,?,'2026-01-01')",
    args: [content, content],
  });
  await database.client.execute({ sql: "INSERT INTO history VALUES('history','page','tr',?,'2026-01-01')", args: [content] });
  const { convertUploadedImages } = await import("../lib/cms/convert-uploads");
  const report = await convertUploadedImages();
  assert.equal(report.converted, 1);
  assert.deepEqual(await readFile(path.join(report.backup, "legacy.png")), original);
  const record = (await database.client.execute("SELECT * FROM assets WHERE id='legacy'")).rows[0];
  assert.equal(record.url, "/api/media/legacy");
  assert.equal(record.name, "klinik.webp");
  assert.equal(record.version, 5);
  assert.equal(record.alt, "Klinik");
  assert.equal(record.source_url, "https://example.com/source");
  assert.equal(record.created_at, "2026-01-01");
  assert.equal((await sharp(await media.assetBytes(record)).metadata()).format, "webp");
  const edition = (await database.client.execute("SELECT * FROM editions WHERE id='edition'")).rows[0];
  assert.equal(edition.draft, content);
  assert.equal(edition.published, content);
  assert.equal((await database.client.execute("SELECT data FROM history WHERE id='history'")).rows[0].data, content);
  assert.equal((await convertUploadedImages()).converted, 0);
  assert.equal((await readdir(media.uploadDir)).includes("legacy.png"), false);
});

test("video uploads retain their original bytes and MIME type", async () => {
  const video = Buffer.from([0, 0, 0, 16, 102, 116, 121, 112, 109, 112, 52, 50, 0, 0, 0, 0]);
  const asset = await media.uploadMedia(request(video, "video.mp4", "video/mp4"));
  const record = (await database.client.execute({ sql: "SELECT * FROM assets WHERE id=?", args: [asset.id] })).rows[0];
  assert.equal(asset.mime, "video/mp4");
  assert.equal(asset.name, "video.mp4");
  assert.deepEqual(await media.assetBytes(record), video);
});
