import path from "node:path";
import sharp from "sharp";

export function uploadName(name: string, extension?: string) {
  const safe = path.basename(name.replace(/\\/g, "/")).replace(/[\x00-\x1f]/g, "");
  if (!extension) return safe.slice(0, 200);
  const stem = safe.slice(0, safe.length - path.extname(safe).length) || "photo";
  return `${stem.slice(0, 199 - extension.length)}.${extension}`;
}

/** Fully decode before storing; preserve dimensions, alpha and animated WebP frames. */
export async function imageToWebp(buffer: Buffer, mime: string) {
  const input = sharp(buffer, {
    limitInputPixels: 50_000_000,
    animated: true,
    failOn: "warning",
  });
  const metadata = await input.metadata();
  const format = metadata.format === "heif" ? "avif" : metadata.format;
  if (
    !["jpeg", "png", "webp", "avif"].includes(format || "") ||
    mime !== `image/${format}` || !metadata.width || !metadata.height
  ) throw new Error("Unsupported image bytes");

  return input.autoOrient().webp({ quality: 90, alphaQuality: 100, effort: 4 }).toBuffer();
}
