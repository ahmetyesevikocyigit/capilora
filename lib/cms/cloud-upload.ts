import { randomUUID } from "node:crypto";
import { del } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { z } from "zod";
import { client } from "./db";
import { cloudStorage, readPrivateBlob } from "./file-storage";
import { saveMedia } from "./media";
import { CmsError } from "./store";

const inputSchema = z.object({
  name: z.string().min(1).max(500),
  mime: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif", "video/mp4", "video/webm"]),
  size: z.number().int().positive(),
});

export async function startUpload(input: unknown) {
  if (!cloudStorage()) throw new CmsError("Dosya yükleme kullanılamıyor.", 400);
  const { name, mime, size } = inputSchema.parse(input);
  const maximum = (mime.startsWith("video/") ? 100 : 20) * 1024 * 1024;
  if (size > maximum) throw new CmsError("Dosya boyutu sınırı aşıldı.", 413);
  const id = randomUUID(), pathname = `incoming/${id}.${mime.split("/")[1]}`;
  await client.execute({
    sql: "INSERT INTO uploads(id,pathname,name,mime,size,expires_at) VALUES(?,?,?,?,?,?)",
    args: [id, pathname, name, mime, size, Date.now() + 60 * 60 * 1000],
  });
  // Clean up abandoned private uploads when a new upload starts.
  const stale = (await client.execute({ sql: "SELECT id,pathname FROM uploads WHERE expires_at<?", args: [Date.now() - 3600000] })).rows;
  for (const row of stale) {
    try {
      await del(String(row.pathname));
      await client.execute({ sql: "DELETE FROM uploads WHERE id=?", args: [row.id] });
    } catch { /* Retry cleanup on the next upload. */ }
  }
  return { id, pathname };
}

// The caller checks both the administrator session and the request origin.
export async function uploadToken(request: Request, body: HandleUploadBody) {
  if (body.type !== "blob.generate-client-token") throw new CmsError("Geçersiz yükleme isteği.");
  return handleUpload({
    request, body,
    onBeforeGenerateToken: async (pathname) => {
      const row = (await client.execute({ sql: "SELECT * FROM uploads WHERE pathname=?", args: [pathname] })).rows[0];
      if (!row || Number(row.expires_at) < Date.now() || row.processing_at)
        throw new CmsError("Yükleme süresi doldu. Dosyayı tekrar seçin.", 400);
      return {
        allowedContentTypes: [String(row.mime)],
        maximumSizeInBytes: Number(row.size),
        validUntil: Number(row.expires_at),
        addRandomSuffix: false,
        allowOverwrite: false,
      };
    },
  });
}

export async function finishUpload(input: unknown) {
  const { id } = z.object({ id: z.string().uuid() }).parse(input);
  const existing = (await client.execute({ sql: "SELECT * FROM assets WHERE id=?", args: [id] })).rows[0];
  if (existing) return existing;
  const claimed = await client.execute({
    sql: "UPDATE uploads SET processing_at=? WHERE id=? AND expires_at>? AND (processing_at IS NULL OR processing_at<?) RETURNING *",
    args: [Date.now(), id, Date.now(), Date.now() - 5 * 60000],
  });
  const row = claimed.rows[0];
  if (!row) throw new CmsError("Yükleme tamamlanamadı veya hâlâ işleniyor. Tekrar deneyin.", 409);
  try {
    // Read only the server-generated pathname; never fetch a client-provided URL.
    const { bytes, mime } = await readPrivateBlob(String(row.pathname), Number(row.size));
    if (bytes.length !== Number(row.size) || mime !== row.mime)
      throw new CmsError("Dosya bilgileri doğrulanamadı.");
    const asset = await saveMedia(new File([new Uint8Array(bytes)], String(row.name), { type: mime }), id);
    await del(String(row.pathname));
    await client.execute({ sql: "DELETE FROM uploads WHERE id=?", args: [id] });
    return asset;
  } catch (e) {
    await client.execute({ sql: "UPDATE uploads SET processing_at=NULL WHERE id=?", args: [id] });
    throw e;
  }
}
