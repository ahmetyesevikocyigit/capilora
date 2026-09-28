import { randomUUID } from "node:crypto";
import { imageToWebp, uploadName } from "./image-upload";
import { client } from "./db";
import { storeFile, deleteFile, readAsset } from "./file-storage";
import { ensureSeed } from "./seed";
import { CmsError } from "./store";
export { uploadDir } from "./file-storage";
export async function listMedia() {
  await ensureSeed();
  return (await client.execute("SELECT * FROM assets ORDER BY created_at DESC"))
    .rows;
}
export async function uploadMedia(request: Request) {
  const limit = 102 * 1024 * 1024;
  if (Number(request.headers.get("content-length") || 0) > limit)
    throw new CmsError("Dosya boyutu sınırı aşıldı.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new CmsError("Dosya seçin.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel();
      throw new CmsError("Dosya boyutu sınırı aşıldı.", 413);
    }
    chunks.push(value);
  }
  const body = Buffer.concat(chunks);
  const form = await new Request(request.url, {
    method: "POST",
    headers: { "content-type": request.headers.get("content-type") || "" },
    body,
  }).formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new CmsError("Dosya seçin.");
  return saveMedia(file);
}
export async function saveMedia(file: File, id: string = randomUUID()) {
  const isVideo = ["video/mp4", "video/webm"].includes(file.type);
  if (file.size > (isVideo ? 100 : 20) * 1024 * 1024)
    throw new CmsError(
      isVideo
        ? "Video en fazla 100 MB olabilir."
        : "Görsel en fazla 20 MB olabilir.",
      413,
    );
  if (
    ![
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
      "video/mp4",
      "video/webm",
    ].includes(file.type)
  )
    throw new CmsError("Bu dosya türü desteklenmiyor.");
  let buffer = Buffer.from(await file.arrayBuffer());
  let ext = file.type.split("/")[1];
  let mime = file.type;
  if (isVideo) {
    const valid =
      ext === "mp4"
        ? buffer.subarray(4, 8).toString() === "ftyp"
        : buffer.subarray(0, 4).toString("hex") === "1a45dfa3";
    if (!valid) throw new CmsError("Video dosyası doğrulanamadı.");
  } else {
    try {
      buffer = Buffer.from(await imageToWebp(buffer, file.type));
      ext = "webp";
      mime = "image/webp";
    } catch {
      throw new CmsError("Görsel dosyası doğrulanamadı.");
    }
  }
  const filename = `${id}.${ext}`;
  const name = uploadName(file.name, isVideo ? undefined : "webp") || filename;
  const storedFile = await storeFile(filename, buffer, mime);
  try {
    await client.execute({
      sql: "INSERT INTO assets(id,name,mime,size,url,filename,created_at) VALUES(?,?,?,?,?,?,?)",
      args: [
        id,
        name,
        mime,
        buffer.length,
        `/api/media/${id}`,
        storedFile,
        new Date().toISOString(),
      ],
    });
  } catch (e) {
    await deleteFile(storedFile);
    throw e;
  }
  return { id, url: `/api/media/${id}`, name, mime, size: buffer.length };
}
export async function assetBytes(asset: { [key: string]: unknown }) {
  return readAsset(asset);
}
export async function deleteMedia(id: string) {
  await ensureSeed();
  const tx = await client.transaction("write");
  let filename: string;
  try {
    const row = (
      await tx.execute({ sql: "SELECT * FROM assets WHERE id=?", args: [id] })
    ).rows[0];
    if (!row) throw new CmsError("Dosya bulunamadı.", 404);
    if (!row.filename) throw new CmsError("Başlangıç dosyaları korunur.");
    const ref = JSON.stringify(String(row.url));
    const inUse = (
      await tx.execute({
        sql: "SELECT id FROM editions WHERE instr(draft,?)>0 OR instr(published,?)>0 UNION ALL SELECT id FROM history WHERE instr(data,?)>0 LIMIT 1",
        args: [ref, ref, ref],
      })
    ).rows.length;
    if (inUse)
      throw new CmsError(
        "Dosya bir içerikte veya kayıtlı sürümde kullanılıyor.",
        409,
      );
    filename = String(row.filename);
    await tx.execute({ sql: "DELETE FROM assets WHERE id=?", args: [id] });
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  } finally {
    tx.close();
  }
  await deleteFile(filename);
}
