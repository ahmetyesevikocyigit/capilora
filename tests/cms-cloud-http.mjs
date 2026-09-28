import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { parseEnv } from "node:util";
import { spawn } from "node:child_process";
import { randomBytes, scryptSync } from "node:crypto";
import { createClient } from "@libsql/client";
import { del } from "@vercel/blob";
import { put } from "@vercel/blob/client";
import sharp from "sharp";

// Disposable local CMS + private test files. Never writes the production database.
const env = parseEnv(await readFile(process.argv[2], "utf8"));
assert.ok(env.BLOB_READ_WRITE_TOKEN, "Private test storage is required");
const dir = await mkdtemp(`${tmpdir()}/capilora-cloud-`);
const db = createClient({ url: `file:${dir}/content.db` });
const origin = "http://127.0.0.1:3101", password = "disposable-cloud-test";
const salt = randomBytes(16).toString("hex");
let logs = "", session = "";
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3101"], {
  env: { ...process.env, CMS_DATA_DIR: dir, CMS_DATABASE_URL: `file:${dir}/content.db`, CMS_DATABASE_TOKEN: "",
    CMS_MEDIA_STORAGE: "blob", BLOB_READ_WRITE_TOKEN: env.BLOB_READ_WRITE_TOKEN, BLOB_STORE_ID: "", VERCEL_OIDC_TOKEN: "",
    ADMIN_PASSWORD_HASH: `${salt}:${scryptSync(password, salt, 64).toString("hex")}`, NEXT_DIST_DIR: ".next-build" },
  stdio: ["ignore", "pipe", "pipe"],
});
child.stdout.on("data", b => { logs = (logs + b).slice(-5000); });
child.stderr.on("data", b => { logs = (logs + b).slice(-5000); });
const api = (route, body, cookie = session, requestOrigin = origin) => fetch(`${origin}/api/admin/${route}`, {
  method: body === undefined ? "GET" : "POST",
  headers: { Cookie: cookie, Origin: requestOrigin, "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});
const json = async (response, status = 200) => {
  assert.equal(response.status, status, await response.clone().text()); return response.json();
};
try {
  for (let n = 0; n < 60; n++) {
    try { if ((await fetch(`${origin}/admin`)).status === 200) break; } catch {}
    if (n === 59) throw new Error("Local test server did not start: " + logs);
    await new Promise(r => setTimeout(r, 500));
  }
  for (const route of ["upload-start", "upload-token", "upload-finish"])
    assert.equal((await api(route, {})).status, 401);
  console.log("PASS cloud upload endpoints reject unauthenticated requests");
  const login = await api("login", { password });
  await json(login);
  session = login.headers.get("set-cookie").split(";")[0];
  assert.equal((await json(await api("upload-config"))).direct, true);
  assert.equal((await api("upload-start", { name: "big.png", mime: "image/png", size: 21 * 1024 * 1024 })).status, 413);
  assert.equal((await api("upload-start", { name: "script.svg", mime: "image/svg+xml", size: 10 })).status, 400);
  assert.equal((await api("upload-start", {}, session, "https://untrusted.example")).status, 403);
  const bytes = await sharp(randomBytes(1600 * 1600 * 3), { raw: { width: 1600, height: 1600, channels: 3 } }).png().toBuffer();
  assert.ok(bytes.length > 4.5 * 1024 * 1024);
  const start = await json(await api("upload-start", { name: "cloud-fixture.png", mime: "image/png", size: bytes.length }), 201);
  const tokenBody = { type: "blob.generate-client-token", payload: { pathname: start.pathname, clientPayload: null, multipart: true } };
  assert.equal((await api("upload-token", { ...tokenBody, payload: { ...tokenBody.payload, pathname: "cms/unowned.png" } })).status, 400);
  const token = await json(await api("upload-token", tokenBody));
  const uploaded = await put(start.pathname, bytes, { access: "private", token: token.clientToken, contentType: "image/png", multipart: true });
  assert.notEqual((await fetch(uploaded.url)).status, 200);
  const asset = await json(await api("upload-finish", { id: start.id }), 201);
  assert.equal(asset.mime, "image/webp"); assert.equal(asset.name, "cloud-fixture.webp");
  assert.equal((await json(await api("upload-finish", { id: start.id }), 201)).id, asset.id);
  console.log("PASS large direct upload, private originals, WebP conversion and completion retry");
  assert.equal((await fetch(origin + asset.url)).status, 404);
  const privateResponse = await fetch(origin + asset.url, { headers: { Cookie: session } });
  assert.equal(privateResponse.status, 200);
  assert.equal((await sharp(Buffer.from(await privateResponse.arrayBuffer())).metadata()).format, "webp");
  const { id } = await json(await api("entries", { kind: "page" }), 201);
  let entry = (await json(await api("entries"))).entries.find(e => e.id === id && e.locale === "tr");
  const published = await json(await api(`entries/${id}`, { locale: "tr", version: entry.version, action: "publish", data: { ...entry.draft, title: "Cloud fixture", image: asset.url } }));
  entry = published.entry;
  assert.equal((await fetch(origin + asset.url)).status, 200);
  const range = await fetch(origin + asset.url, { headers: { Range: "bytes=0-19" } });
  assert.equal(range.status, 206); assert.equal((await range.arrayBuffer()).byteLength, 20);
  const suffix = await fetch(origin + asset.url, { headers: { Range: "bytes=-10" } });
  assert.equal(suffix.status, 206); assert.equal((await suffix.arrayBuffer()).byteLength, 10);
  assert.equal((await fetch(origin + asset.url, { headers: { Range: "bytes=999999999-" } })).status, 416);
  assert.equal((await api(`media/${asset.id}`, { action: "delete" })).status, 409);
  await json(await api(`entries/${id}`, { locale: "tr", version: entry.version, action: "unpublish" }));
  assert.equal((await fetch(origin + asset.url)).status, 404);
  console.log("PASS draft privacy, published media streaming/ranges, deletion protection and access revocation");
} finally {
  const stopped = new Promise(r => child.once("exit", r));
  child.kill("SIGTERM");
  const timeout = setTimeout(() => child.kill("SIGKILL"), 5000);
  await stopped; clearTimeout(timeout);
  const assets = (await db.execute("SELECT filename FROM assets WHERE filename LIKE 'blob:%'")).rows;
  const pending = (await db.execute("SELECT pathname FROM uploads")).rows;
  for (const filename of [...assets.map(r => String(r.filename).slice(5)), ...pending.map(r => String(r.pathname))])
    await del(filename, { token: env.BLOB_READ_WRITE_TOKEN });
  db.close(); await rm(dir, { recursive: true, force: true });
}
