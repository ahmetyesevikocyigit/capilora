import { client, migrate } from "@/lib/cms/db";
import { authenticated } from "@/lib/cms/auth";
import { mediaUsage } from "@/lib/cms/store";
import { assetBytes } from "@/lib/cms/media";
import { assetStream } from "@/lib/cms/file-storage";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await migrate();
  const { id } = await params;
  const asset = (
    await client.execute({ sql: "SELECT * FROM assets WHERE id=?", args: [id] })
  ).rows[0];
  if (
    !asset ||
    (!(await mediaUsage(String(asset.url))).some((u) => u.published) &&
      !(await authenticated()))
  )
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  try {
    const headers: Record<string, string> = {
      "Content-Type": String(asset.mime),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "bytes",
    };
    const range = request.headers.get("range");
    const size = Number(asset.size);
    let selected: { start: number; end: number } | undefined;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      const start = match?.[1] ? Number(match[1]) : Math.max(0, size - Number(match?.[2]));
      const end = match?.[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
      if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(start) || start > end || start >= size)
        return new Response(null, {
          status: 416,
          headers: { ...headers, "Content-Range": `bytes */${size}` },
        });
      selected = { start, end };
    }
    const blob = await assetStream(asset, selected ? `bytes=${selected.start}-${selected.end}` : undefined);
    if (blob) {
      const contentRange = blob.headers.get("content-range");
      if (contentRange) headers["Content-Range"] = contentRange;
      headers["Content-Length"] = String(blob.blob.size);
      return new Response(blob.stream, { status: contentRange ? 206 : 200, headers });
    }
    const bytes = await assetBytes(asset);
    if (selected) {
      const { start, end } = selected;
      headers["Content-Range"] = `bytes ${start}-${end}/${bytes.length}`;
      headers["Content-Length"] = String(end - start + 1);
      return new Response(bytes.subarray(start, end + 1), {
        status: 206,
        headers,
      });
    }
    headers["Content-Length"] = String(bytes.length);
    return new Response(bytes, { headers });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
