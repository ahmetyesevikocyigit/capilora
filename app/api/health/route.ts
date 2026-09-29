import { client, migrate } from "@/lib/cms/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await migrate();
    await client.execute("SELECT 1");
    return Response.json({ ok: true, service: "capilora" });
  } catch {
    return Response.json(
      { ok: false, service: "capilora" },
      { status: 503 },
    );
  }
}
