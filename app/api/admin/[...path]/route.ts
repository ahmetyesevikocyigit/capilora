import { cookies } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import { zipSync, strToU8 } from "fflate";
import { z } from "zod";
import { client } from "@/lib/cms/db";
import { requireAdmin, login, logout, sameOrigin, changePassword } from "@/lib/cms/auth";
import {
  CmsError,
  listEntries,
  createEntry,
  changeEntry,
  history,
  mediaUsage,
} from "@/lib/cms/store";
import { kinds, safeUrl } from "@/lib/cms/types";
import { cloudStorage } from "@/lib/cms/file-storage";
import { startUpload, uploadToken, finishUpload } from "@/lib/cms/cloud-upload";
import {
  listMedia,
  uploadMedia,
  deleteMedia,
  assetBytes,
} from "@/lib/cms/media";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
async function body(request: Request) {
  const text = await request.text();
  if (text.length > 2_000_000) throw new CmsError("İçerik çok büyük.", 413);
  return JSON.parse(text);
}
function error(e: unknown) {
  if (e instanceof CmsError) return json({ error: e.message }, e.status);
  if (e instanceof z.ZodError)
    return json(
      {
        error: e.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("\n"),
      },
      400,
    );
  console.error(
    "CMS operation failed",
    e instanceof Error ? e.name : "unknown",
  );
  return json({ error: "İşlem tamamlanamadı. Tekrar deneyin." }, 500);
}
export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    await requireAdmin();
    const [route, id] = (await params).path;
    if (route === "upload-config") return json({ direct: cloudStorage() });
    const lang = z
      .enum(["tr", "en"])
      .parse(new URL(request.url).searchParams.get("lang") || "tr");
    if (route === "entries") return json({ entries: await listEntries() });
    if (route === "history") return json({ history: await history(id, lang) });
    if (route === "media") {
      const assets = await listMedia();
      return json({
        assets: await Promise.all(
          assets.map(async (a) => ({
            ...a,
            usage: await mediaUsage(String(a.url)),
          })),
        ),
      });
    }
    if (route === "export") {
      const entries = await listEntries(),
        assets = await listMedia();
      const revisions = (await client.execute("SELECT * FROM history")).rows,
        redirects = (await client.execute("SELECT * FROM redirects")).rows;
      const files: Record<string, Uint8Array> = {
        "content.json": strToU8(
          JSON.stringify(
            {
              format: "capilora-content-v1",
              exportedAt: new Date().toISOString(),
              entries,
              assets,
              revisions,
              redirects,
            },
            null,
            2,
          ),
        ),
      };
      for (const a of assets)
        files[`media/${a.id}/${a.name}`] = new Uint8Array(await assetBytes(a));
      const archive = zipSync(files);
      let offset = 0;
      const stream = new ReadableStream<Uint8Array>({
        pull(controller) {
          if (offset >= archive.length) return controller.close();
          controller.enqueue(archive.subarray(offset, offset + 64 * 1024));
          offset += 64 * 1024;
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="capilora-${new Date().toISOString().slice(0, 10)}.zip"`,
          "Cache-Control": "no-store",
        },
      });
    }
    return json({ error: "Bulunamadı." }, 404);
  } catch (e) {
    return error(e);
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    sameOrigin(request);
    const [route, id] = (await params).path;
    if (route === "login") {
      const nativeForm = !request.headers
        .get("content-type")
        ?.includes("application/json");
      const input = z
        .object({ password: z.string().max(200) })
        .parse(
          nativeForm
            ? Object.fromEntries(await request.formData())
            : await body(request),
        );
      await login(request, input.password);
      if (nativeForm)
        return new Response(null, {
          status: 303,
          headers: { Location: "/admin/genel", "Cache-Control": "no-store" },
        });
      return json({ ok: true });
    }
    await requireAdmin();
    if (route === "upload-start") return json(await startUpload(await body(request)), 201);
    if (route === "upload-token") return json(await uploadToken(request, await body(request)));
    if (route === "upload-finish") return json(await finishUpload(await body(request)), 201);
    if (route === "password") {
      await changePassword(await body(request));
      return json({ ok: true });
    }
    if (route === "logout") {
      await logout();
      return json({ ok: true });
    }
    if (route === "preview") {
      const input = z
        .object({ enabled: z.boolean() })
        .parse(await body(request));
      (await cookies()).set("capilora_preview", input.enabled ? "1" : "0", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 8 * 3600,
      });
      return json({ ok: true });
    }
    if (route === "media") {
      if (!id) return json(await uploadMedia(request), 201);
      const input = z
        .object({
          action: z.enum(["update", "delete"]),
          alt: z.string().max(500).default(""),
          sourceUrl: safeUrl.default(""),
          version: z.number().int().positive().optional(),
        })
        .parse(await body(request));
      if (input.action === "delete") await deleteMedia(id);
      else {
        if (!input.version) throw new CmsError("Dosya sürümü eksik.", 400);
        const result = await client.execute({
          sql: "UPDATE assets SET alt=?,source_url=?,version=version+1 WHERE id=? AND version=?",
          args: [input.alt, input.sourceUrl, id, input.version],
        });
        if (!result.rowsAffected)
          throw new CmsError(
            "Dosya başka bir sekmede değiştirildi. Güncel kaydı açın.",
            409,
          );
      }
      return json({ ok: true });
    }
    if (route === "entries") {
      if (!id) {
        const input = z
          .object({ kind: z.enum(kinds) })
          .parse(await body(request));
        return json({ id: await createEntry(input.kind) }, 201);
      }
      const input = z
        .object({
          locale: z.enum(["tr", "en"]),
          version: z.number().int().positive(),
          action: z.enum([
            "save",
            "publish",
            "unpublish",
            "restoreVersion",
            "trash",
            "recover",
          ]),
          data: z.unknown().optional(),
          historyId: z.string().optional(),
        })
        .parse(await body(request));
      const entry = await changeEntry(
        id,
        input.locale,
        input.version,
        input.action,
        input.data,
        input.historyId,
      );
      revalidateTag("cms", { expire: 0 });
      revalidatePath("/[lang]", "layout");
      revalidatePath("/sitemap.xml");
      return json({ entry });
    }
    return json({ error: "Bulunamadı." }, 404);
  } catch (e) {
    return error(e);
  }
}
