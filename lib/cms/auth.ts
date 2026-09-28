import {
  randomBytes,
  createHash,
} from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { z } from "zod";
import { client, dataDir, migrate } from "./db";
import { audit, CmsError } from "./store";
import { hashPassword, verifyPassword } from "./password";
const cookieName = "capilora_admin";
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
async function readCredential(database: Pick<typeof client, "execute"> = client) {
  const saved = (await database.execute("SELECT password_hash FROM credentials WHERE id='admin'")).rows[0];
  if (saved) return String(saved.password_hash);
  try {
    return process.env.ADMIN_PASSWORD_HASH ||
      readFileSync(path.join(dataDir, "admin-secret"), "utf8").trim();
  } catch {
    throw new CmsError("Panel şifresi henüz yapılandırılmadı.", 503);
  }
}
async function limitAttempts(key: string) {
  const now = Date.now();
  const result = await client.execute({
    sql: "INSERT INTO attempts(ip,count,window_start) VALUES(?,1,?) ON CONFLICT(ip) DO UPDATE SET count=CASE WHEN window_start<? THEN 1 ELSE count+1 END,window_start=CASE WHEN window_start<? THEN ? ELSE window_start END RETURNING count",
    args: [key, now, now - 900000, now - 900000, now],
  });
  if (Number(result.rows[0].count) > 5)
    throw new CmsError("Çok fazla deneme yapıldı. 15 dakika sonra tekrar deneyin.", 429);
}
export async function authenticated() {
  await migrate();
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return false;
  const r = await client.execute({
    sql: "SELECT expires_at FROM sessions WHERE token_hash=?",
    args: [digest(token)],
  });
  return !!r.rows[0] && Number(r.rows[0].expires_at) > Date.now();
}
export async function requireAdmin() {
  if (!(await authenticated())) throw new CmsError("Lütfen giriş yapın.", 401);
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const target = new URL(request.url);
  // Next may normalize request.url to localhost. Host is the browser's actual
  // destination authority; do not trust client-supplied forwarded headers.
  const host = request.headers.get("host") || target.host;
  let valid = false;
  try {
    const source = new URL(origin || "");
    valid = source.host === host && source.protocol === target.protocol;
  } catch {}
  if (!valid) throw new CmsError("İstek doğrulanamadı.", 403);
}
export async function login(request: Request, password: string) {
  await migrate();
  const ip = digest(
    process.env.VERCEL === "1"
      ? request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"
      : "local",
  );
  await limitAttempts(ip);
  const credential = await readCredential();
  if (!(await verifyPassword(credential, password))) {
    await audit("login-failed");
    throw new CmsError("Şifre doğru değil.", 401);
  }
  const token = randomBytes(32).toString("hex");
  const tx = await client.transaction("write");
  try {
    // A password change must also invalidate a login already in flight.
    if ((await readCredential(tx)) !== credential)
      throw new CmsError("Şifre değiştirildi. Yeni şifrenizle tekrar giriş yapın.", 401);
    await tx.execute({ sql: "DELETE FROM attempts WHERE ip=?", args: [ip] });
    await tx.execute({ sql: "DELETE FROM sessions WHERE expires_at<?", args: [Date.now()] });
    await tx.execute({
      sql: "INSERT INTO sessions VALUES(?,?)",
      args: [digest(token), Date.now() + 8 * 3600000],
    });
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  } finally {
    tx.close();
  }
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 3600,
  });
  await audit("login");
}
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Mevcut şifrenizi girin.").max(200, "Şifre en fazla 200 karakter olabilir."),
  newPassword: z.string().min(12, "Yeni şifre en az 12 karakter olmalı.").max(200, "Şifre en fazla 200 karakter olabilir."),
  confirmPassword: z.string().max(200, "Şifre en fazla 200 karakter olabilir."),
}).superRefine((input, ctx) => {
  if (input.newPassword !== input.confirmPassword)
    ctx.addIssue({ code: "custom", message: "Yeni şifreler eşleşmiyor." });
  if (input.newPassword === input.currentPassword)
    ctx.addIssue({ code: "custom", message: "Yeni şifreniz mevcut şifrenizden farklı olmalı." });
});
export async function changePassword(input: unknown) {
  await requireAdmin();
  const valid = passwordChangeSchema.safeParse(input);
  if (!valid.success)
    throw new CmsError(valid.error.issues.map((issue) => issue.message).join("\n"), 400);
  const { currentPassword, newPassword } = valid.data;
  const key = digest("admin-password-change");
  await limitAttempts(key);
  const credential = await readCredential();
  if (!(await verifyPassword(credential, currentPassword))) {
    await audit("password-change-failed");
    throw new CmsError("Mevcut şifreniz doğru değil.", 400);
  }
  const replacement = await hashPassword(newPassword);
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const tx = await client.transaction("write");
  try {
    const session = token && (await tx.execute({
      sql: "SELECT expires_at FROM sessions WHERE token_hash=?", args: [digest(token)],
    })).rows[0];
    if (!session || Number(session.expires_at) <= Date.now())
      throw new CmsError("Oturumunuz sona erdi. Tekrar giriş yapın.", 401);
    if ((await readCredential(tx)) !== credential)
      throw new CmsError("Şifre başka bir oturumda değiştirildi. Tekrar giriş yapın.", 409);
    await tx.execute({
      sql: "INSERT INTO credentials(id,password_hash,updated_at) VALUES('admin',?,?) ON CONFLICT(id) DO UPDATE SET password_hash=excluded.password_hash,updated_at=excluded.updated_at",
      args: [replacement, new Date().toISOString()],
    });
    await tx.execute("DELETE FROM sessions");
    await tx.execute({ sql: "DELETE FROM attempts WHERE ip=?", args: [key] });
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  } finally {
    tx.close();
  }
  store.delete(cookieName);
  store.delete("capilora_preview");
  await audit("password-changed");
}
export async function logout() {
  const store = await cookies(),
    token = store.get(cookieName)?.value;
  if (token)
    await client.execute({
      sql: "DELETE FROM sessions WHERE token_hash=?",
      args: [digest(token)],
    });
  store.delete(cookieName);
  store.delete("capilora_preview");
  await audit("logout");
}
export async function isPreview() {
  return (
    (await cookies()).get("capilora_preview")?.value === "1" &&
    (await authenticated())
  );
}
