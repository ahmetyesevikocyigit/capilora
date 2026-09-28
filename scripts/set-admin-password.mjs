import { mkdir } from "node:fs/promises";
import { hash, Algorithm } from "@node-rs/argon2";
import path from "node:path";
import { createClient } from "@libsql/client";
const directory = process.env.CMS_DATA_DIR || path.join(process.cwd(), ".data");
if (!process.stdin.isTTY)
  throw new Error("Şifreyi kendi terminalinizde girin.");
async function hidden(prompt) {
  process.stdout.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    const input = (buffer) => {
      const text = buffer.toString();
      if (text === "\u0003") {
        done();
        reject(new Error("İptal edildi."));
      } else if (text === "\r" || text === "\n") {
        done();
        resolve(value);
      } else if (text === "\u007f") {
        value = value.slice(0, -1);
      } else if (!text.includes("\u001b")) value += text;
    };
    const done = () => {
      process.stdin.off("data", input);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    };
    process.stdin.on("data", input);
  });
}
const password = await hidden("Yeni yönetim şifresi: ");
if (password.length < 12) throw new Error("En az 12 karakter kullanın.");
if (password.length > 200) throw new Error("En fazla 200 karakter kullanın.");
if (password !== (await hidden("Şifreyi tekrar girin: ")))
  throw new Error("Şifreler eşleşmiyor.");
const credential = await hash(password, {
  algorithm: Algorithm.Argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1,
});
await mkdir(directory, { recursive: true, mode: 0o700 });
const db = createClient({
  url: process.env.CMS_DATABASE_URL || `file:${path.join(directory, "content.db")}`,
  authToken: process.env.CMS_DATABASE_TOKEN,
});
const tx = await db.transaction("write");
try {
  await tx.execute("CREATE TABLE IF NOT EXISTS credentials(id TEXT PRIMARY KEY,password_hash TEXT NOT NULL,updated_at TEXT NOT NULL)");
  await tx.execute({
    sql: "INSERT INTO credentials(id,password_hash,updated_at) VALUES('admin',?,?) ON CONFLICT(id) DO UPDATE SET password_hash=excluded.password_hash,updated_at=excluded.updated_at",
    args: [credential, new Date().toISOString()],
  });
  const exists = (await tx.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'")).rows.length;
  if (exists) await tx.execute("DELETE FROM sessions");
  await tx.commit();
} catch (e) {
  await tx.rollback();
  throw e;
} finally {
  tx.close();
  db.close();
}
console.log("Şifre kaydedildi. Önceki oturumlar kapatıldı.");
