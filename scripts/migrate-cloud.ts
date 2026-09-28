import { createClient, type InValue, type InStatement } from "@libsql/client";
import { get, put } from "@vercel/blob";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, chmod } from "node:fs/promises";
import { parseEnv } from "node:util";
import path from "node:path";

// Explicit one-time migration. Never load cloud credentials into local .env.local.
async function main() {
  const envFile = process.argv[2];
  if (!envFile) throw new Error("Usage: tsx scripts/migrate-cloud.ts <private production env file>");
  const env = parseEnv(await readFile(envFile, "utf8"));
  const remoteUrl = env.CMS_DATABASE_URL || env.TURSO_DATABASE_URL;
  const remoteToken = env.CMS_DATABASE_TOKEN || env.TURSO_AUTH_TOKEN;
  if (!remoteUrl || !remoteToken || !/^libsql:\/\//.test(remoteUrl))
    throw new Error("A remote Turso database and token are required.");
  const blobToken = env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) throw new Error("A private Blob store token is required.");
  const localDir = path.join(process.cwd(), ".data");
  const local = createClient({ url: `file:${path.join(localDir, "content.db")}` });
  const remote = createClient({ url: remoteUrl, authToken: remoteToken });
  const marker = "local-to-cloud-2026-09-27-v1";
  const tables = ["documents", "editions", "history", "redirects", "assets", "events", "migrations"];
  const ledgerDir = path.join(localDir, "cloud-migration");
  await mkdir(ledgerDir, { recursive: true, mode: 0o700 });
  await chmod(envFile, 0o600);
  const existingTables = (await remote.execute("SELECT name FROM sqlite_schema WHERE type='table'")).rows;
  if (existingTables.some(r => r.name === "migrations") &&
      (await remote.execute({ sql: "SELECT name FROM migrations WHERE name=?", args: [marker] })).rows.length) {
    console.log("Migration already completed; cloud content was not overwritten.");
    local.close(); remote.close(); return;
  }
  if (existingTables.some(r => r.name === "documents") &&
      Number((await remote.execute("SELECT COUNT(*) AS n FROM documents")).rows[0].n) > 0)
    throw new Error("Cloud database contains content. Refusing to overwrite it.");
  const schema = (await local.execute("SELECT sql FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'")).rows;
  await remote.executeMultiple(schema.map(r => String(r.sql).replace("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS ") + ";").join("\n"));
  const snapshot = await local.transaction("read");
  const rows: Record<string, Record<string, InValue>[]> = {};
  for (const table of tables) rows[table] = (await snapshot.execute(`SELECT * FROM ${table}`)).rows as Record<string, InValue>[];
  let credential: Record<string, InValue> | undefined = (await snapshot.execute("SELECT * FROM credentials WHERE id='admin'")).rows[0];
  await snapshot.commit(); snapshot.close();
  if (!credential) credential = {
    id: "admin", password_hash: (await readFile(path.join(localDir, "admin-secret"), "utf8")).trim(),
    updated_at: new Date().toISOString(),
  };
  // This backup contains content only, never credentials or sessions.
  await writeFile(path.join(ledgerDir, "content-before-migration.json"), JSON.stringify(rows), { mode: 0o600 });
  let media: Record<string, string> = {};
  const ledger = path.join(ledgerDir, "media.json");
  try { media = JSON.parse(await readFile(ledger, "utf8")); } catch {}
  const digest = (b: Buffer) => createHash("sha256").update(b).digest("hex");
  for (const asset of rows.assets) {
    if (!asset.filename) continue;
    const id = String(asset.id), filename = String(asset.filename);
    if (filename.startsWith("blob:")) throw new Error("The source must be the local database.");
    const bytes = await readFile(path.join(localDir, "uploads", filename));
    const pathname = `cms/${filename}`;
    if (!media[id]) {
      const existing = await get(pathname, { access: "private", token: blobToken, useCache: false });
      if (existing?.statusCode === 200) {
        const saved = Buffer.from(await new Response(existing.stream).arrayBuffer());
        if (digest(saved) !== digest(bytes)) throw new Error(`Unexpected file at migration destination: ${id}`);
      } else {
        await put(pathname, bytes, { access: "private", token: blobToken, contentType: String(asset.mime), addRandomSuffix: false });
      }
      media[id] = "blob:" + pathname;
      await writeFile(ledger, JSON.stringify(media, null, 2), { mode: 0o600 });
    }
    asset.filename = media[id];
  }
  const insert = (table: string, row: Record<string, InValue>): InStatement => ({
    sql: `INSERT INTO ${table}(${Object.keys(row).map(k => `"${k}"`).join(",")}) VALUES(${Object.keys(row).map(() => "?").join(",")})`,
    args: Object.values(row),
  });
  const statements = tables.flatMap(table => rows[table].map(row => insert(table, row)));
  statements.push(insert("credentials", credential));
  statements.push(insert("migrations", { name: marker, created_at: new Date().toISOString() }));
  await remote.batch(statements, "write");
  for (const table of tables) {
    const n = Number((await remote.execute(`SELECT COUNT(*) AS n FROM ${table}`)).rows[0].n);
    const expected = rows[table].length + (table === "migrations" ? 1 : 0);
    if (n !== expected) throw new Error(`Count mismatch for ${table}`);
    console.log(`${table}: ${n} verified`);
  }
  console.log(`Private media transferred: ${Object.keys(media).length}. Existing admin password preserved; sessions excluded.`);
  local.close(); remote.close();
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Migration failed"); process.exitCode = 1; });
