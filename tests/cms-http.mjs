import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomBytes, scryptSync, createHash } from "node:crypto";
import { createClient } from "@libsql/client";
import { unzipSync, strFromU8 } from "fflate";
import sharp from "sharp";

// Disposable localhost fixture only. Never points at the clinic's database.
const directory = await mkdtemp(path.join(tmpdir(), "capilora-http-"));
const production = process.env.CMS_HTTP_PRODUCTION === "1";
const origin = "http://127.0.0.1:3101",
  password = "capilora-http-test-only";
const salt = randomBytes(16).toString("hex");
let logs = "";
function startServer(){
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    production ? "start" : "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3101",
  ],
  {
    env: {
      ...process.env,
      CMS_DATA_DIR: directory,
      CMS_DATABASE_URL: `file:${directory}/content.db`,
      CMS_DATABASE_TOKEN: "",
      ADMIN_PASSWORD_HASH: `${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
      NEXT_DIST_DIR: production ? ".next-build" : ".next-qa",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
child.stdout.on("data", (x) => {
  logs = (logs + x).slice(-8000);
});
child.stderr.on("data", (x) => {
  logs = (logs + x).slice(-8000);
});
return child;
}
let server=startServer();
const db = createClient({ url: `file:${directory}/content.db` });
let session = "",
  preview = "";
const request = (url, options = {}) =>
  fetch(origin + url, { redirect: "manual", ...options });
async function api(route, data, cookie = session) {
  return request("/api/admin/" + route, {
    method: data === undefined ? "GET" : "POST",
    headers: {
      ...(data === undefined
        ? {}
        : { Origin: origin, "Content-Type": "application/json" }),
      Cookie: cookie,
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
}
const check = async (name, fn) => {
  await fn();
  console.log("PASS " + name);
};
const json = async (response, status = 200) => {
  assert.equal(response.status, status, await response.clone().text());
  return response.json();
};
async function stop() {
  server.kill("SIGTERM");
  await new Promise((r) => server.once("exit", r));
  db.close();
  await rm(directory, { recursive: true, force: true });
}
async function waitForServer(){
  for (let i = 0; i < 90; i++) {
    try {
      if ((await request("/admin")).status === 200) break;
    } catch {}
    if (i === 89) throw new Error("Server not ready: " + logs);
    await new Promise((r) => setTimeout(r, 500));
  }
}
let cleanup = false;
try {
  await waitForServer();
  await check("authentication gates and Origin protection", async () => {
    assert.equal((await api("entries", undefined, "")).status, 401);
    assert.equal((await api("entries", { kind: "page" }, "")).status, 401);
    assert.equal((await request("/admin/genel")).status, 307);
    assert.equal(
      (
        await request("/api/admin/login", {
          method: "POST",
          headers: {
            Origin: "https://outside.invalid",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password }),
        })
      ).status,
      403,
    );
    assert.equal(
      (await api("login", { password: "incorrect" }, "")).status,
      401,
    );
    const response = await api("login", { password }, "");
    await json(response);
    const cookie = response.headers.get("set-cookie");
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=lax/i);
    assert.match(cookie, /Max-Age=28800/i);
    session = cookie.split(";")[0];
  });
  await check("native login form keeps credentials out of URLs", async () => {
    const response = await request("/api/admin/login", {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ password }).toString(),
    });
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), "/admin/genel");
  });
  const entries = (await json(await api("entries"))).entries;
  await check("Google reviews cannot be changed manually", async () => {
    assert.equal((await api("entries", { kind: "review" })).status, 403);
    const review = entries.find(e => e.kind === "review" && e.locale === "tr");
    assert.ok(review);
    assert.equal((await api(`entries/${review.id}`, {
      locale: "tr", version: review.version, action: "save",
      data: { ...review.draft, excerpt: "Unwanted manual change" },
    })).status, 403);
    const settings = entries.find(e => e.kind === "settings" && e.locale === "tr");
    const saved = await json(await api(`entries/${settings.id}`, {
      locale: "tr", version: settings.version, action: "save",
      data: { ...settings.draft, rating: 1, reviewCount: 999999, checkedAt: "2000-01-01" },
    }));
    assert.equal(saved.entry.draft.rating, settings.draft.rating);
    assert.equal(saved.entry.draft.reviewCount, settings.draft.reviewCount);
    assert.equal(saved.entry.draft.checkedAt, settings.draft.checkedAt);
    assert.equal((await request(`/admin/duzenle/${review.id}`, { headers: { Cookie: session } })).status, 307);
  });
  await check("clinic content edits preserve fixed navigation and branding", async () => {
    const settings = (await json(await api("entries"))).entries.find(e => e.kind === "settings" && e.locale === "tr");
    const saved = await json(await api(`entries/${settings.id}`, {
      locale: "tr", version: settings.version, action: "save",
      data: { ...settings.draft, menu: [], creditUrl: "https://example.com", wordmark: "Changed", footerBody: "İletişim metni kontrolü" },
    }));
    assert.deepEqual(saved.entry.draft.menu, settings.draft.menu);
    assert.equal(saved.entry.draft.creditUrl, settings.draft.creditUrl);
    assert.equal(saved.entry.draft.wordmark, settings.draft.wordmark);
    assert.equal(saved.entry.draft.footerBody, "İletişim metni kontrolü");
    const response = await request("/admin/menu-footer", { headers: { Cookie: session } });
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), "/admin/ayarlar");
  });
  await check(
    "seed is complete and URLs are served in both languages",
    async () => {
      assert.equal(entries.filter((e) => e.kind === "page").length, 22);
      for (const lang of ["tr", "en"]) {
        assert.equal((await request("/" + lang)).status, 200);
      }
      const res = await request("/admin/genel", {
        headers: { Cookie: session },
      });
      assert.equal(res.status, 200);
      assert.match(await res.text(), /noindex/);
    },
  );
  await check('all existing page drafts can be edited without changing publication',async()=>{
    for(const e of entries.filter(e=>e.kind==='page')){
      const first=await json(await api('entries/'+e.id,{locale:e.locale,version:e.version,action:'save',data:{...e.draft,title:e.draft.title+' (kontrol)'}}));
      assert.equal(first.entry.published.title,e.published.title);
      await json(await api('entries/'+e.id,{locale:e.locale,version:first.entry.version,action:'save',data:e.draft}));
    }
    for(const e of entries.filter(e=>['page','article'].includes(e.kind))){
      const url='/'+e.locale+(e.kind==='article'?'/'+(e.locale==='tr'?'makale-kosesi':'articles'):'')+(e.draft.slug?'/'+e.draft.slug:'');
      assert.equal((await request(url)).status,200,url);
    }
  });
  await check("gallery page and homepage strip share published photos without leaking drafts", async () => {
    let gallery = (await json(await api("entries"))).entries.find(e => e.id === "gallery" && e.locale === "tr");
    const initial = gallery.draft;
    const changeGallery = async (action, data = gallery.draft) => {
      gallery = (await json(await api("entries/gallery", {
        locale: "tr", version: gallery.version, action, data,
      }))).entry;
    };
    const page = await (await request("/tr/galeri")).text();
    assert.match(page, /<h1>Galeri<\/h1>/);
    assert.match(page, /href="\/en\/gallery"/);
    assert.doesNotMatch(await (await request("/tr")).text(), /class="gallery-strip"/);
    await changeGallery("save", { ...initial, blocks: [{
      ...initial.blocks[0], items: [{ id: "gallery-fixture", image: "/media/service-hair.webp", alt: "Private gallery photo", title: "Private gallery photo" }],
    }] });
    assert.doesNotMatch(await (await request("/tr/galeri")).text(), /Private gallery photo/);
    assert.doesNotMatch(await (await request("/tr")).text(), /class="gallery-strip"/);
    const response = await api("preview", { enabled: true });
    const previewCookie = response.headers.get("set-cookie").split(";")[0];
    const previewHome = await (await request("/tr", { headers: { Cookie: session + "; " + previewCookie } })).text();
    assert.match(previewHome, /class="gallery-strip"/);
    await api("preview", { enabled: false });
    await changeGallery("publish");
    assert.match(await (await request("/tr/galeri")).text(), /Private gallery photo/);
    assert.match(await (await request("/tr")).text(), /class="gallery-strip"/);
    assert.doesNotMatch(await (await request("/en")).text(), /class="gallery-strip"/);
    await changeGallery("publish", { ...gallery.draft, slug: "foto-galeri" });
    assert.match(await (await request("/tr")).text(), /href="\/tr\/foto-galeri"/);
    assert.equal((await request("/tr/galeri")).status, 308);
    await changeGallery("unpublish");
    const hidden = await (await request("/tr")).text();
    assert.doesNotMatch(hidden, /class="gallery-strip"/);
    assert.doesNotMatch(hidden, /href="\/tr\/galeri"/);
    await changeGallery("publish", initial);
  });
  await check("content publishes without technical form fields and metadata follows the visible content", async () => {
    const id = (await json(await api("entries", { kind: "page" }), 201)).id;
    let page = (await json(await api("entries"))).entries.find(e => e.id === id && e.locale === "tr");
    page = (await json(await api("entries/" + id, {
      locale: "tr", version: page.version, action: "publish", data: { ...page.draft,
        title: "Yeni İçerik", blocks: [{ id: "intro", type: "imageText", text: "Sayfanın kendi açıklaması.", image: "/media/service-hair.webp" }],
      },
    }))).entry;
    assert.equal(page.published.slug, "yeni-icerik");
    const html = await (await request("/tr/yeni-icerik")).text();
    assert.match(html, /<title>Yeni İçerik \| Capilora Hair Clinic<\/title>/);
    assert.match(html, /name="description" content="Sayfanın kendi açıklaması\."/);
    assert.match(html, /property="og:image" content="[^\"]*\/media\/service-hair.webp"/);
    const revised = (await json(await api("entries/" + id, {
      locale: "tr", version: page.version, action: "save", data: { ...page.draft, title: "Değişen başlık" },
    }))).entry;
    assert.equal(revised.draft.slug, "yeni-icerik");
    await json(await api("entries/" + id, { locale: "tr", version: revised.version, action: "trash" }));
  });
  const id = (await json(await api("entries", { kind: "page" }), 201)).id;
  let entry = (await json(await api("entries"))).entries.find(
    (e) => e.id === id && e.locale === "tr",
  );
  const change = async (action, data = entry.draft) => {
    entry = (
      await json(
        await api("entries/" + id, {
          locale: "tr",
          version: entry.version,
          action,
          data,
        }),
      )
    ).entry;
    return entry;
  };
  await change("save", {
    ...entry.draft,
    title: "HTTP kontrolü",
    slug: "http-kontrolu",
    seoTitle: "Kontrol başlığı",
    blocks: [
      {
        id: "body",
        type: "text",
        enabled: true,
        title: "Yayın metni",
        text: "Yalnızca taslakta bulunan cümle.",
      },
      { id: "hidden", type: "text", enabled: false, title: "Gizli blok metni" },
    ],
  });
  await check(
    "private preview, no draft leak, noindex and no-store",
    async () => {
      assert.equal((await request("/tr/http-kontrolu")).status, 404);
      const response = await api("preview", { enabled: true });
      preview = response.headers.get("set-cookie").split(";")[0];
      const draft = await request("/tr/http-kontrolu", {
        headers: { Cookie: session + "; " + preview },
      });
      assert.equal(draft.status, 200);
      const html = await draft.text();
      assert.match(html, /Yalnızca taslakta/);
      assert.match(html, /<meta name="robots" content="noindex, nofollow"/);
      assert.match(
        draft.headers.get("cache-control"),
        production ? /no-store/ : /no-cache/,
      );
      assert.equal(
        (await request("/tr/http-kontrolu", { headers: { Cookie: preview } }))
          .status,
        404,
      );
      await api("preview", { enabled: false });
    },
  );
  await check(
    "publication, hidden blocks, metadata and isolated languages",
    async () => {
      await change("publish");
      const res = await request("/tr/http-kontrolu");
      assert.equal(res.status, 200);
      const html = await res.text();
      assert.match(html, /<title>Kontrol başlığı<\/title>/);
      assert.match(html, /<h2>Yayın metni/);
      assert.doesNotMatch(html, /<h2>Gizli blok metni/);
      assert.doesNotMatch(html, /<link rel="alternate" hrefLang="en"/);
      assert.match(
        await (await request("/sitemap.xml")).text(),
        /\/tr\/http-kontrolu/,
      );
      const liveTitle = entry.draft.title;
      await change("save", {
        ...entry.draft,
        title: "Sadece taslak değişikliği",
      });
      const normal = await (await request("/tr/http-kontrolu")).text();
      assert.match(normal, new RegExp(liveTitle));
      assert.doesNotMatch(normal, /Sadece taslak değişikliği/);
      const en = (await json(await api("entries"))).entries.find(
        (e) => e.id === id && e.locale === "en",
      );
      await json(
        await api("entries/" + id, {
          locale: "en",
          version: en.version,
          action: "publish",
          data: {
            ...entry.draft,
            title: "English version",
            slug: "http-check",
          },
        }),
      );
      assert.equal((await request("/en/http-check")).status, 200);
      assert.match(
        await (await request("/tr/http-kontrolu")).text(),
        /hrefLang="en"/,
      );
    },
  );
  await check("stale save and immediate redirect", async () => {
    const staleVersion = entry.version;
    await change("publish", { ...entry.draft, slug: "http-yeni" });
    assert.equal(
      (
        await api("entries/" + id, {
          locale: "tr",
          version: staleVersion,
          action: "save",
          data: entry.draft,
        })
      ).status,
      409,
    );
    const redirect = await request("/tr/http-kontrolu");
    assert.equal(redirect.status, 308);
    assert.equal(redirect.headers.get("location"), "/tr/http-yeni");
    assert.equal((await request("/tr/http-yeni")).status, 200);
  });
  let media;
  await check(
    "private upload becomes public only through publication",
    async () => {
      const bytes = await sharp({ create: { width: 12, height: 8, channels: 4, background: "#123c4380" } }).png().toBuffer();
      const form = new FormData();
      form.set("file", new File([bytes], "fixture.png", { type: "image/png" }));
      media = await json(
        await request("/api/admin/media", {
          method: "POST",
          headers: { Origin: origin, Cookie: session },
          body: form,
        }),
        201,
      );
      assert.equal(media.name, "fixture.webp");
      assert.equal(media.mime, "image/webp");
      assert.equal((await request(media.url)).status, 404);
      const photo = await request(media.url, { headers: { Cookie: session } });
      assert.equal(photo.status, 200);
      assert.equal(photo.headers.get("content-type"), "image/webp");
      const savedBytes = Buffer.from(await photo.arrayBuffer());
      assert.equal((await sharp(savedBytes).metadata()).format, "webp");
      assert.equal(media.size, savedBytes.length);
      assert.equal(Number(photo.headers.get("content-length")), savedBytes.length);
      await change("save", { ...entry.draft, image: media.url });
      assert.equal((await request(media.url)).status, 404);
      await change("publish");
      assert.equal((await request(media.url)).status, 200);
      assert.equal(
        (await api("media/" + media.id, { action: "delete" })).status,
        409,
      );
      const assets = (await json(await api("media"))).assets;
      const a = assets.find((a) => a.id === media.id);
      await json(
        await api("media/" + a.id, {
          action: "update",
          version: a.version,
          alt: "Kontrol görseli",
        }),
      );
      assert.equal(
        (
          await api("media/" + a.id, {
            action: "update",
            version: a.version,
            alt: "Eski sekme",
          })
        ).status,
        409,
      );
      await change("unpublish");
      assert.equal((await request(media.url)).status, 404);
    },
  );
  await check(
    "export contains content and media without credentials or sessions",
    async () => {
      const res = await api("export");
      assert.equal(res.status, 200);
      const files = unzipSync(new Uint8Array(await res.arrayBuffer()));
      const content = JSON.parse(strFromU8(files["content.json"]));
      assert.equal(content.format, "capilora-content-v1");
      assert.ok(content.entries.length);
      assert.ok(Object.keys(files).some((n) => n.includes("fixture.webp")));
      assert.ok(!("sessions" in content));
      assert.ok(
        !Object.keys(files).some((n) => /secret|\.env|session/.test(n)),
      );
    },
  );
  await check('records and sessions survive a server restart',async()=>{
    server.kill('SIGTERM');await new Promise(r=>server.once('exit',r));server=startServer();await waitForServer();
    const saved=(await json(await api('entries'))).entries.find(e=>e.id===id&&e.locale==='tr');
    assert.equal(saved.version,entry.version);assert.equal(saved.draft.slug,'http-yeni');assert.equal(saved.draft.image,media.url);assert.equal(saved.published,null);
    assert.equal((await request(media.url,{headers:{Cookie:session}})).status,200);
  });
  await check(
    "trash, draft recovery and expired/revoked sessions",
    async () => {
      await change("trash");
      assert.equal((await request("/en/http-check")).status, 404);
      await change("recover");
      assert.equal((await request("/en/http-check")).status, 404);
      await change("trash");
      const cookieValue = session.split("=")[1];
      await db.execute({
        sql: "UPDATE sessions SET expires_at=? WHERE token_hash=?",
        args: [
          Date.now() - 1,
          createHash("sha256").update(cookieValue).digest("hex"),
        ],
      });
      assert.equal((await api("entries")).status, 401);
      const login = await api("login", { password }, "");
      session = login.headers.get("set-cookie").split(";")[0];
      await json(login);
      await json(await api("logout", {}));
      assert.equal((await api("entries")).status, 401);
    },
  );
  await check("failed login rate limit", async () => {
    for (let i = 0; i < 5; i++)
      assert.equal((await api("login", { password: "wrong" }, "")).status, 401);
    assert.equal((await api("login", { password: "wrong" }, "")).status, 429);
    await db.execute("DELETE FROM attempts");
  });
  const replacementPassword = "capilora-new-fixture-password";
  const passwordInput = (currentPassword = password, newPassword = replacementPassword) => ({
    currentPassword, newPassword, confirmPassword: newPassword,
  });
  await check("password changes require a valid session, Origin and matching valid inputs", async () => {
    assert.equal((await api("password", passwordInput(), "")).status, 401);
    assert.equal((await api("password", passwordInput())).status, 401);
    const login = await api("login", { password }, "");
    await json(login);
    session = login.headers.get("set-cookie").split(";")[0];
    const form = await request("/admin/ayarlar", { headers: { Cookie: session } });
    assert.equal(form.status, 200);
    assert.equal(form.headers.get("x-frame-options"), "DENY");
    assert.match(await form.text(), /Şifre değiştir/);
    assert.equal((await request("/api/admin/password", {
      method: "POST", headers: { Origin: "https://outside.invalid", Cookie: session, "Content-Type": "application/json" },
      body: JSON.stringify(passwordInput()),
    })).status, 403);
    for (const invalid of [
      {}, passwordInput(password, "short"), passwordInput(password, "x".repeat(201)),
      passwordInput(password, password), { ...passwordInput(), confirmPassword: "does-not-match" },
      { ...passwordInput(), currentPassword: "x".repeat(201) },
    ]) assert.equal((await api("password", invalid)).status, 400);
    const wrong = await api("password", passwordInput("incorrect-current-password"));
    assert.match((await json(wrong, 400)).error, /Mevcut şifreniz doğru değil/);
    assert.equal((await api("entries")).status, 200);
    assert.equal((await db.execute("SELECT id FROM credentials")).rows.length, 0);
    const digest = createHash("sha256").update(session.split("=")[1]).digest("hex");
    await db.execute({ sql: "UPDATE sessions SET expires_at=? WHERE token_hash=?", args: [Date.now() - 1, digest] });
    assert.equal((await api("password", passwordInput())).status, 401);
    const again = await api("login", { password }, "");
    await json(again);
    session = again.headers.get("set-cookie").split(";")[0];
    await db.execute("DELETE FROM attempts");
  });
  await check("current-password attempts are limited across admin sessions", async () => {
    for (let i = 0; i < 5; i++)
      assert.equal((await api("password", passwordInput("wrong-current"))).status, 400);
    const again = await api("login", { password }, "");
    await json(again);
    const otherSession = again.headers.get("set-cookie").split(";")[0];
    assert.equal((await api("password", passwordInput(), otherSession)).status, 429);
    assert.equal((await api("entries")).status, 200);
    await db.execute("DELETE FROM attempts");
  });
  await check("password changes revoke every session and invalidate old credentials", async () => {
    const secondLogin = await api("login", { password }, "");
    await json(secondLogin);
    const secondSession = secondLogin.headers.get("set-cookie").split(";")[0];
    const result = await api("password", passwordInput());
    await json(result);
    assert.equal(result.headers.get("cache-control"), "no-store");
    assert.match(result.headers.get("set-cookie"), /capilora_admin=;/);
    assert.match(result.headers.get("set-cookie"), /capilora_preview=;/);
    assert.equal((await api("entries")).status, 401);
    assert.equal((await api("entries", undefined, secondSession)).status, 401);
    assert.equal((await api("password", passwordInput(), secondSession)).status, 401);
    assert.equal((await api("login", { password }, "")).status, 401);
    const login = await api("login", { password: replacementPassword }, "");
    await json(login);
    session = login.headers.get("set-cookie").split(";")[0];
    assert.equal((await api("entries")).status, 200);
    const credential = (await db.execute("SELECT password_hash FROM credentials WHERE id='admin'")).rows[0].password_hash;
    assert.match(credential, /^\$argon2id\$/);
    assert.ok(!credential.includes(replacementPassword));
    const files = unzipSync(new Uint8Array(await (await api("export")).arrayBuffer()));
    const data = strFromU8(files["content.json"]);
    const audit = JSON.stringify((await db.execute("SELECT * FROM events")).rows);
    const entriesJson = await (await api("entries")).text();
    for (const secret of [credential, password, replacementPassword, "password_hash"]) {
      assert.ok(!data.includes(secret));
      assert.ok(!entriesJson.includes(secret));
      assert.ok(!audit.includes(secret));
    }
    assert.ok(!Object.keys(files).some(name => /secret|credential|session|content\.db/.test(name)));
    assert.match(await (await request("/admin?password=changed")).text(), /Şifreniz güncellendi/);
  });
  await check("changed passwords persist through restart and concurrent changes cannot overwrite each other", async () => {
    server.kill("SIGTERM"); await new Promise(resolve => server.once("exit", resolve));
    server = startServer(); await waitForServer();
    assert.equal((await api("login", { password }, "")).status, 401);
    const login = await api("login", { password: replacementPassword }, "");
    await json(login);
    session = login.headers.get("set-cookie").split(";")[0];
    const second = await api("login", { password: replacementPassword }, "");
    await json(second);
    const otherSession = second.headers.get("set-cookie").split(";")[0];
    // Restore only this disposable fixture's original password for optional UI QA.
    const results = await Promise.all([
      api("password", passwordInput(replacementPassword, password)),
      api("password", passwordInput(replacementPassword, password), otherSession),
    ]);
    assert.equal(results.filter(result => result.status === 200).length, 1);
    assert.ok(results.some(result => [401, 409].includes(result.status)));
    const restored = await api("login", { password }, "");
    await json(restored);
    session = restored.headers.get("set-cookie").split(";")[0];
  });
  console.log("HTTP acceptance checks passed.");
  if (process.env.CMS_QA_KEEP === "1") {
    console.log("Disposable QA server ready at " + origin + "/admin");
    process.on("SIGINT", async () => {
      if (!cleanup) {
        cleanup = true;
        await stop();
        process.exit(0);
      }
    });
  } else {
    cleanup = true;
    await stop();
  }
} catch (error) {
  console.error(error);
  console.error(logs);
  cleanup = true;
  await stop();
  process.exitCode = 1;
}
