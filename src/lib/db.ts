import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = process.env.DATA_DIR || "./data";

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const sqlite = new Database(join(DATA_DIR, "db.sqlite"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

// Create tables if they don't exist
const createTablesSql = `
  CREATE TABLE IF NOT EXISTS api_keys (
    key TEXT PRIMARY KEY,
    prefix TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_used_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS buckets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    owner TEXT NOT NULL,
    description TEXT,
    for_field TEXT,
    created_at INTEGER NOT NULL,
    expires_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bucket_id TEXT NOT NULL REFERENCES buckets(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(bucket_id, path)
  );
`;

sqlite.exec(createTablesSql);

// Migrations — idempotent column additions
const migrations = [
  `ALTER TABLE files ADD COLUMN short_id TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS files_short_id ON files(short_id)`,
];
for (const sql of migrations) {
  try { sqlite.exec(sql); } catch { /* column/index already exists */ }
}
