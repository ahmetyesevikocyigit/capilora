import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { client, dataDir, migrate } from "./db";
import { imageToWebp, uploadName } from "./image-upload";

/** Explicit maintenance job, never run on public requests. URLs and content stay unchanged. */
export async function convertUploadedImages() {
  await migrate();
  const assets = (await client.execute(
    "SELECT * FROM assets WHERE filename IS NOT NULL AND mime IN ('image/jpeg','image/png','image/avif')",
  )).rows;
  const report = { converted: 0, beforeBytes: 0, afterBytes: 0, backup: "" };
  if (!assets.length) return report;

  const uploads = path.join(dataDir, "uploads");
  report.backup = path.join(dataDir, "backups", `webp-${Date.now()}-${randomUUID()}`);
  await mkdir(report.backup, { recursive: true, mode: 0o700 });
  await writeFile(path.join(report.backup, "assets.json"), JSON.stringify(assets, null, 2), { mode: 0o600 });

  for (const asset of assets) {
    const original = await readFile(path.join(uploads, String(asset.filename)));
    const webp = await imageToWebp(original, String(asset.mime));
    // Back up the original before changing the asset; only the database pointer is switched.
    await writeFile(path.join(report.backup, String(asset.filename)), original, { mode: 0o600, flag: "wx" });
    const filename = `${asset.id}-${randomUUID()}.webp`;
    const destination = path.join(uploads, filename);
    await writeFile(destination, webp, { mode: 0o600, flag: "wx" });
    try {
      const result = await client.execute({
        sql: "UPDATE assets SET name=?,mime='image/webp',size=?,filename=?,version=version+1 WHERE id=? AND version=? AND filename=?",
        args: [uploadName(String(asset.name), "webp"), webp.length, filename, asset.id, asset.version, asset.filename],
      });
      if (result.rowsAffected !== 1) throw new Error(`Dosya başka bir işlemde değiştirildi: ${asset.id}`);
    } catch (error) {
      await unlink(destination);
      throw error;
    }
    await unlink(path.join(uploads, String(asset.filename)));
    report.converted++;
    report.beforeBytes += original.length;
    report.afterBytes += webp.length;
  }
  return report;
}
