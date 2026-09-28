import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { del, get, put } from "@vercel/blob";
import { dataDir } from "./db";

export const uploadDir = path.join(dataDir, "uploads");
export const cloudStorage = () => process.env.VERCEL === "1" || process.env.CMS_MEDIA_STORAGE === "blob";
const blobPrefix = "blob:";

export async function storeFile(filename: string, bytes: Buffer, mime: string) {
  if (cloudStorage()) {
    const pathname = `cms/${filename}`;
    await put(pathname, bytes, { access: "private", contentType: mime, addRandomSuffix: false });
    return blobPrefix + pathname;
  }
  await mkdir(uploadDir, { recursive: true, mode: 0o700 });
  await writeFile(path.join(uploadDir, filename), bytes, { mode: 0o600 });
  return filename;
}

export async function deleteFile(filename: string) {
  if (filename.startsWith(blobPrefix)) await del(filename.slice(blobPrefix.length));
  else await unlink(path.join(uploadDir, filename));
}

export async function readPrivateBlob(pathname: string, maximumSize: number) {
  const result = await get(pathname, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200) throw new Error("File not found");
  if (result.blob.size > maximumSize) {
    await result.stream.cancel();
    throw new Error("File too large");
  }
  const reader = result.stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maximumSize) {
      await reader.cancel();
      throw new Error("File too large");
    }
    chunks.push(value);
  }
  return { bytes: Buffer.concat(chunks), mime: result.blob.contentType };
}

export async function readAsset(asset: { [key: string]: unknown }) {
  const filename = String(asset.filename || "");
  if (filename.startsWith(blobPrefix))
    return (await readPrivateBlob(filename.slice(blobPrefix.length), 110 * 1024 * 1024)).bytes;
  return readFile(filename
    ? path.join(uploadDir, filename)
    : path.join(process.cwd(), "public", String(asset.url)));
}

/** Stream private files through the already-authorized media route. */
export async function assetStream(asset: { [key: string]: unknown }, range?: string) {
  const filename = String(asset.filename || "");
  if (!filename.startsWith(blobPrefix)) return null;
  const result = await get(filename.slice(blobPrefix.length), {
    access: "private", headers: range ? { Range: range } : undefined,
  });
  if (!result || result.statusCode !== 200) throw new Error("File not found");
  return result;
}
