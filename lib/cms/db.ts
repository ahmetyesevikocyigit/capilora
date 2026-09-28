import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { mkdirSync } from "node:fs";
import path from "node:path";
export const dataDir =
  process.env.CMS_DATA_DIR || path.join(process.cwd(), ".data");
const databaseUrl = process.env.CMS_DATABASE_URL || process.env.TURSO_DATABASE_URL;
if (process.env.VERCEL === "1" && !databaseUrl)
  throw new Error("A persistent CMS database must be configured on Vercel.");
if (!databaseUrl || databaseUrl.startsWith("file:"))
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
export const client = createClient({
  url: databaseUrl || `file:${path.join(dataDir, "content.db")}`,
  authToken: process.env.CMS_DATABASE_TOKEN || process.env.TURSO_AUTH_TOKEN,
});
export const documents = sqliteTable("documents", {
  id: text().primaryKey(),
  kind: text().notNull(),
  createdAt: text("created_at").notNull(),
  deletedAt: text("deleted_at"),
});
export const editions = sqliteTable("editions", {
  id: text().primaryKey(),
  documentId: text("document_id").notNull(),
  locale: text().notNull(),
  version: integer().notNull(),
  draft: text().notNull(),
  published: text(),
  publishedAt: text("published_at"),
  updatedAt: text("updated_at").notNull(),
});
export const db = drizzle(client);
let ready: Promise<void> | undefined;
export function migrate() {
  return (ready ??= (async () => {
    await client.executeMultiple(`
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS documents(id TEXT PRIMARY KEY,kind TEXT NOT NULL,created_at TEXT NOT NULL,deleted_at TEXT);
CREATE TABLE IF NOT EXISTS editions(id TEXT PRIMARY KEY,document_id TEXT NOT NULL REFERENCES documents(id),locale TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,draft TEXT NOT NULL,published TEXT,published_at TEXT,updated_at TEXT NOT NULL,UNIQUE(document_id,locale));
CREATE TABLE IF NOT EXISTS history(id TEXT PRIMARY KEY,document_id TEXT NOT NULL,locale TEXT NOT NULL,data TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS redirects(path TEXT PRIMARY KEY,document_id TEXT NOT NULL,locale TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS assets(id TEXT PRIMARY KEY,name TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,url TEXT NOT NULL,filename TEXT,alt TEXT NOT NULL DEFAULT '',source_url TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS credentials(id TEXT PRIMARY KEY,password_hash TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS attempts(ip TEXT PRIMARY KEY,count INTEGER NOT NULL,window_start INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,event TEXT NOT NULL,document_id TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS migrations(name TEXT PRIMARY KEY,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS uploads(id TEXT PRIMARY KEY,pathname TEXT NOT NULL UNIQUE,name TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,expires_at INTEGER NOT NULL,processing_at INTEGER);
`);
    const tx = await client.transaction("write");
    try {
      const columns = (await tx.execute("PRAGMA table_info(assets)")).rows;
      if (!columns.some((c) => c.name === "version"))
        await tx.execute(
          "ALTER TABLE assets ADD COLUMN version INTEGER NOT NULL DEFAULT 1",
        );
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    } finally {
      tx.close();
    }
  })());
}
