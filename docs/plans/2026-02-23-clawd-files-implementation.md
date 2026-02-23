# Clawd Files v2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a file hosting platform with bucket-based organization, API-first design for LLM agents, file previews, and an admin dashboard.

**Architecture:** Next.js 16 App Router with Server Components first. SQLite via Drizzle ORM for metadata, local filesystem for file storage. REST API for LLM consumers, HTML pages for human consumers. Content negotiation via middleware rewrites.

**Tech Stack:** Next.js 16, TypeScript (strict), Tailwind CSS v4, shadcn/ui, Drizzle ORM + better-sqlite3, Shiki, @vercel/og, nanoid, archiver (ZIP), Docker.

**Design doc:** `docs/plans/2026-02-23-clawd-files-design.md`

---

## Phase 1: Foundation

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `.env.local`, `.gitignore`, `drizzle.config.ts`

**Step 1: Initialize Next.js 16 project**

```bash
cd /home/carbon/clawd-files
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias --turbopack
```

Accept defaults. If it asks about overwriting, say yes (the directory only has `docs/` and `.git`).

**Step 2: Install core dependencies**

```bash
npm install drizzle-orm better-sqlite3 nanoid mime-types archiver
npm install -D drizzle-kit @types/better-sqlite3 @types/mime-types @types/archiver
```

**Step 3: Create `.env.local`**

```env
ADMIN_API_KEY=dev-admin-key-change-me
DATA_DIR=./data
BASE_URL=http://localhost:3000
PORT=3000
```

**Step 4: Add `data/` to `.gitignore`**

Append to `.gitignore`:
```
data/
```

**Step 5: Configure `next.config.ts` for standalone output and better-sqlite3**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
```

**Step 6: Create Drizzle config**

```ts
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: `${process.env.DATA_DIR || "./data"}/db.sqlite`,
  },
});
```

**Step 7: Verify dev server starts**

```bash
npm run dev
```

Visit http://localhost:3000 — should see default Next.js page.

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 16 project with core dependencies"
```

---

### Task 2: Database Schema & Connection

**Files:**
- Create: `src/lib/schema.ts`, `src/lib/db.ts`
- Create: `src/lib/__tests__/db.test.ts`

**Step 1: Write the Drizzle schema**

```ts
// src/lib/schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const apiKeys = sqliteTable("api_keys", {
  key: text("key").primaryKey(),            // SHA-256 hash
  prefix: text("prefix").notNull(),          // first 8 chars of raw key
  name: text("name").notNull(),              // display label
  createdAt: integer("created_at").notNull(),
  lastUsedAt: integer("last_used_at").notNull(),
});

export const buckets = sqliteTable("buckets", {
  id: text("id").primaryKey(),               // 10-char nanoid
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull(),       // FK to api_keys.key
  owner: text("owner").notNull(),            // display name snapshot
  description: text("description"),
  forField: text("for_field"),               // "for" display
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at"),          // null = never
});

export const files = sqliteTable("files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bucketId: text("bucket_id").notNull().references(() => buckets.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  size: integer("size").notNull(),
  mimeType: text("mime_type").notNull(),
  createdAt: integer("created_at").notNull(),
});
```

**Step 2: Write the database connection module**

```ts
// src/lib/db.ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = process.env.DATA_DIR || "./data";

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const sqlite = new Database(join(DATA_DIR, "db.sqlite"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

// Auto-create tables on first import
sqlite.exec(`
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
`);
```

**Step 3: Install vitest for testing**

```bash
npm install -D vitest
```

Add to `package.json` scripts: `"test": "vitest run", "test:watch": "vitest"`

**Step 4: Write a smoke test for db connection**

```ts
// src/lib/__tests__/db.test.ts
import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";

// Set DATA_DIR to a temp location before importing db
process.env.DATA_DIR = "/tmp/clawd-test-" + Date.now();

import { db } from "../db";
import { apiKeys, buckets, files } from "../schema";

describe("database", () => {
  it("can insert and query an api key", () => {
    db.insert(apiKeys).values({
      key: "test-hash",
      prefix: "test1234",
      name: "Test Key",
      createdAt: Math.floor(Date.now() / 1000),
      lastUsedAt: Math.floor(Date.now() / 1000),
    }).run();

    const rows = db.select().from(apiKeys).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Test Key");
  });

  it("cascade deletes files when bucket is deleted", () => {
    const now = Math.floor(Date.now() / 1000);
    db.insert(buckets).values({
      id: "test-bkt-01",
      name: "Test Bucket",
      keyHash: "test-hash",
      owner: "Test Key",
      createdAt: now,
    }).run();

    db.insert(files).values({
      bucketId: "test-bkt-01",
      path: "hello.txt",
      size: 5,
      mimeType: "text/plain",
      createdAt: now,
    }).run();

    db.delete(buckets).where(eq(buckets.id, "test-bkt-01")).run();

    const remainingFiles = db.select().from(files).all();
    expect(remainingFiles).toHaveLength(0);
  });
});
```

**Step 5: Run tests**

```bash
npm test
```

Expected: 2 tests pass.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Drizzle schema and SQLite database connection"
```

---

### Task 3: Auth Library

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/lib/__tests__/auth.test.ts`

**Step 1: Write auth tests**

```ts
// src/lib/__tests__/auth.test.ts
import { describe, it, expect } from "vitest";
import { createHash } from "crypto";

process.env.DATA_DIR = "/tmp/clawd-test-auth-" + Date.now();
process.env.ADMIN_API_KEY = "test-admin-key";

import { authenticate, generateDashboardToken, verifyDashboardToken } from "../auth";
import { db } from "../db";
import { apiKeys } from "../schema";

function makeRequest(bearer?: string): Request {
  const headers = new Headers();
  if (bearer) headers.set("Authorization", `Bearer ${bearer}`);
  return new Request("http://localhost/api/test", { headers });
}

describe("authenticate", () => {
  it("returns admin for ADMIN_API_KEY", async () => {
    const result = await authenticate(makeRequest("test-admin-key"));
    expect(result).toEqual({ type: "admin" });
  });

  it("throws for missing auth header", async () => {
    await expect(authenticate(makeRequest())).rejects.toThrow();
  });

  it("returns key info for valid LLM key", async () => {
    const rawKey = "llm-test-key-12345678";
    const hash = createHash("sha256").update(rawKey).digest("hex");
    const now = Math.floor(Date.now() / 1000);

    db.insert(apiKeys).values({
      key: hash,
      prefix: rawKey.slice(0, 8),
      name: "Test LLM",
      createdAt: now,
      lastUsedAt: now,
    }).run();

    const result = await authenticate(makeRequest(rawKey));
    expect(result).toEqual({ type: "key", keyHash: hash, name: "Test LLM" });
  });

  it("throws for unknown key", async () => {
    await expect(authenticate(makeRequest("unknown-key"))).rejects.toThrow();
  });
});

describe("dashboard tokens", () => {
  it("generates and verifies a valid token", () => {
    const token = generateDashboardToken();
    expect(verifyDashboardToken(token)).toBe(true);
  });

  it("rejects tampered token", () => {
    expect(verifyDashboardToken("tampered.token")).toBe(false);
  });

  it("rejects expired token", () => {
    const token = generateDashboardToken(-1);
    expect(verifyDashboardToken(token)).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- src/lib/__tests__/auth.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement auth module**

```ts
// src/lib/auth.ts
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { apiKeys } from "./schema";

export type AuthResult =
  | { type: "admin" }
  | { type: "key"; keyHash: string; name: string };

export class AuthError extends Error {
  constructor(
    message: string,
    public hint: string,
    public status: number = 401,
  ) {
    super(message);
  }
}

export async function authenticate(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError(
      "Missing authentication",
      "Include an Authorization: Bearer <key> header.",
    );
  }

  const rawKey = authHeader.slice(7);
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey) {
    throw new AuthError("Server misconfigured", "ADMIN_API_KEY not set.", 500);
  }

  // Check admin key (timing-safe comparison)
  if (rawKey.length === adminKey.length) {
    const a = Buffer.from(rawKey);
    const b = Buffer.from(adminKey);
    if (timingSafeEqual(a, b)) {
      return { type: "admin" };
    }
  }

  // Check LLM API key
  const hash = createHash("sha256").update(rawKey).digest("hex");
  const key = db.select().from(apiKeys).where(eq(apiKeys.key, hash)).get();

  if (!key) {
    throw new AuthError(
      "Invalid API key",
      "Check your API key. It may have been revoked.",
    );
  }

  // Update last_used_at
  const now = Math.floor(Date.now() / 1000);
  db.update(apiKeys).set({ lastUsedAt: now }).where(eq(apiKeys.key, hash)).run();

  return { type: "key", keyHash: hash, name: key.name };
}

export function generateDashboardToken(validHours: number = 24): string {
  const adminKey = process.env.ADMIN_API_KEY!;
  const expiresAt = Math.floor(Date.now() / 1000) + validHours * 3600;
  const signature = createHmac("sha256", adminKey)
    .update(String(expiresAt))
    .digest("hex");
  return Buffer.from(`${expiresAt}.${signature}`).toString("base64url");
}

export function verifyDashboardToken(token: string): boolean {
  try {
    const adminKey = process.env.ADMIN_API_KEY;
    if (!adminKey) return false;

    const decoded = Buffer.from(token, "base64url").toString();
    const dotIndex = decoded.indexOf(".");
    if (dotIndex === -1) return false;

    const expiresAt = parseInt(decoded.slice(0, dotIndex), 10);
    const signature = decoded.slice(dotIndex + 1);

    if (isNaN(expiresAt)) return false;
    if (expiresAt < Math.floor(Date.now() / 1000)) return false;

    const expected = createHmac("sha256", adminKey)
      .update(String(expiresAt))
      .digest("hex");

    if (signature.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
```

**Step 4: Run tests**

```bash
npm test -- src/lib/__tests__/auth.test.ts
```

Expected: All tests pass.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add auth library with API key validation and HMAC dashboard tokens"
```

---

### Task 4: Storage Library

**Files:**
- Create: `src/lib/storage.ts`
- Create: `src/lib/__tests__/storage.test.ts`

**Step 1: Write storage tests**

```ts
// src/lib/__tests__/storage.test.ts
import { describe, it, expect, afterAll } from "vitest";
import { existsSync, readFileSync, rmSync } from "fs";
import { join } from "path";

const TEST_DIR = "/tmp/clawd-test-storage-" + Date.now();
process.env.DATA_DIR = TEST_DIR;

import { saveFile, deleteFile, deleteBucket, getFilePath, getDataDir } from "../storage";

describe("storage", () => {
  it("saves a file to the correct path", async () => {
    await saveFile("bucket1", "hello.txt", Buffer.from("hello world"));
    const filePath = getFilePath("bucket1", "hello.txt");
    expect(existsSync(filePath)).toBe(true);
    expect(readFileSync(filePath, "utf-8")).toBe("hello world");
  });

  it("saves nested paths creating intermediate directories", async () => {
    await saveFile("bucket1", "reports/q1/data.csv", Buffer.from("a,b,c"));
    const filePath = getFilePath("bucket1", "reports/q1/data.csv");
    expect(existsSync(filePath)).toBe(true);
  });

  it("replaces file at existing path", async () => {
    await saveFile("bucket2", "file.txt", Buffer.from("v1"));
    await saveFile("bucket2", "file.txt", Buffer.from("v2"));
    const filePath = getFilePath("bucket2", "file.txt");
    expect(readFileSync(filePath, "utf-8")).toBe("v2");
  });

  it("deletes a single file", async () => {
    await saveFile("bucket3", "delete-me.txt", Buffer.from("bye"));
    const filePath = getFilePath("bucket3", "delete-me.txt");
    expect(existsSync(filePath)).toBe(true);
    await deleteFile("bucket3", "delete-me.txt");
    expect(existsSync(filePath)).toBe(false);
  });

  it("deletes entire bucket directory", async () => {
    await saveFile("bucket4", "a.txt", Buffer.from("a"));
    await saveFile("bucket4", "b/c.txt", Buffer.from("c"));
    await deleteBucket("bucket4");
    expect(existsSync(join(getDataDir(), "files", "bucket4"))).toBe(false);
  });

  afterAll(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- src/lib/__tests__/storage.test.ts
```

**Step 3: Implement storage module**

```ts
// src/lib/storage.ts
import { existsSync, mkdirSync, writeFileSync, unlinkSync, rmSync, readFileSync, createReadStream } from "fs";
import { join, dirname } from "path";
import type { ReadStream } from "fs";

export function getDataDir(): string {
  return process.env.DATA_DIR || "./data";
}

export function getFilePath(bucketId: string, filePath: string): string {
  // Prevent path traversal
  const normalized = filePath.replace(/\.\./g, "").replace(/^\/+/, "");
  return join(getDataDir(), "files", bucketId, normalized);
}

export async function saveFile(
  bucketId: string,
  filePath: string,
  content: Buffer,
): Promise<void> {
  const fullPath = getFilePath(bucketId, filePath);
  const dir = dirname(fullPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(fullPath, content);
}

export async function deleteFile(
  bucketId: string,
  filePath: string,
): Promise<void> {
  const fullPath = getFilePath(bucketId, filePath);
  if (existsSync(fullPath)) {
    unlinkSync(fullPath);
  }
}

export async function deleteBucket(bucketId: string): Promise<void> {
  const dir = join(getDataDir(), "files", bucketId);
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function getFileStream(
  bucketId: string,
  filePath: string,
): ReadStream | null {
  const fullPath = getFilePath(bucketId, filePath);
  if (!existsSync(fullPath)) return null;
  return createReadStream(fullPath);
}

export function getFileBuffer(
  bucketId: string,
  filePath: string,
): Buffer | null {
  const fullPath = getFilePath(bucketId, filePath);
  if (!existsSync(fullPath)) return null;
  return readFileSync(fullPath);
}
```

**Step 4: Run tests**

```bash
npm test -- src/lib/__tests__/storage.test.ts
```

Expected: All pass.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add file storage library with save/delete/stream operations"
```

---

### Task 5: URL Helper & Expiry Utils

**Files:**
- Create: `src/lib/urls.ts`
- Create: `src/lib/expiry.ts`

**Step 1: Implement URL helper**

```ts
// src/lib/urls.ts

function getBaseUrl(): string {
  return process.env.BASE_URL || "http://localhost:3000";
}

export function bucketUrl(bucketId: string) {
  const base = getBaseUrl();
  return {
    url: `${base}/${bucketId}`,
    api_url: `${base}/api/buckets/${bucketId}`,
  };
}

export function fileUrl(bucketId: string, filePath: string) {
  const base = getBaseUrl();
  return {
    url: `${base}/${bucketId}/${filePath}`,
    raw_url: `${base}/raw/${bucketId}/${filePath}`,
    api_url: `${base}/api/buckets/${bucketId}`,
  };
}
```

**Step 2: Implement expiry utils**

```ts
// src/lib/expiry.ts

const EXPIRY_PRESETS: Record<string, number> = {
  "1h": 3600,
  "6h": 21600,
  "12h": 43200,
  "1d": 86400,
  "3d": 259200,
  "1w": 604800,
  "2w": 1209600,
  "1m": 2592000,
  never: 0,
};

export function parseExpiry(input?: string): number | null {
  if (!input || input === "never") return null;
  const seconds = EXPIRY_PRESETS[input];
  if (seconds !== undefined && seconds > 0) {
    return Math.floor(Date.now() / 1000) + seconds;
  }
  const num = parseInt(input, 10);
  if (!isNaN(num) && num > 0) {
    return Math.floor(Date.now() / 1000) + num;
  }
  // Default to 1 week
  return Math.floor(Date.now() / 1000) + 604800;
}

export function isExpired(expiresAt: number | null): boolean {
  if (expiresAt === null) return false;
  return expiresAt < Math.floor(Date.now() / 1000);
}

export function secondsRemaining(expiresAt: number | null): number | null {
  if (expiresAt === null) return null;
  return Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add URL helper and expiry utility functions"
```

---

### Task 6: JSON Response Helper

**Files:**
- Create: `src/lib/response.ts`

**Step 1: Implement standardized JSON response helpers**

```ts
// src/lib/response.ts
import { NextResponse } from "next/server";

export function jsonSuccess(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(error: string, hint: string, status = 400) {
  return NextResponse.json({ error, hint }, { status });
}

export function jsonNotFound(
  error = "Not found",
  hint = "The resource does not exist or has expired.",
) {
  return jsonError(error, hint, 404);
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add standardized JSON response helpers"
```

---

## Phase 2: API Routes

### Task 7: API Keys Endpoints

**Files:**
- Create: `src/app/api/keys/route.ts`
- Create: `src/app/api/keys/[key]/route.ts`

**Step 1: Implement POST and GET /api/keys**

`POST /api/keys`:
- Authenticate as admin
- Read `{ name }` from body
- Generate raw key: `cf_` + 32 random hex bytes
- SHA-256 hash it, store hash + prefix (first 8 chars) + name
- Return raw key (once), prefix, name, created_at

`GET /api/keys`:
- Authenticate as admin
- Query all keys with bucket count subquery
- Return array of { prefix, name, created_at, last_used_at, bucket_count }

**Step 2: Implement DELETE /api/keys/:prefix**

- Authenticate as admin
- Find key by prefix
- Delete the key row (buckets become orphans — no cascade)
- Return { deleted: true, prefix, name }

**Step 3: Test with curl**

```bash
# Create
curl -s -X POST http://localhost:3000/api/keys \
  -H "Authorization: Bearer dev-admin-key-change-me" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Agent"}' | jq .

# List
curl -s http://localhost:3000/api/keys \
  -H "Authorization: Bearer dev-admin-key-change-me" | jq .
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add API key management endpoints (create, list, revoke)"
```

---

### Task 8: Buckets CRUD Endpoints

**Files:**
- Create: `src/app/api/buckets/route.ts`
- Create: `src/app/api/buckets/[id]/route.ts`

**Step 1: Implement POST and GET /api/buckets**

`POST /api/buckets`:
- Authenticate (must be LLM key, not admin)
- Read `{ name, description?, for?, expires_in? }`
- Generate 10-char nanoid
- Parse expires_in with `parseExpiry()`
- Insert bucket with key_hash from auth
- Return bucket data + urls

`GET /api/buckets`:
- Authenticate
- Admin sees all non-expired; LLM key sees own non-expired only
- Filter: `expires_at IS NULL OR expires_at > now`
- Return array of bucket objects with urls

**Step 2: Implement GET, PATCH, DELETE /api/buckets/:id**

`GET /api/buckets/:id`:
- No auth required (public)
- Look up bucket, check not expired
- Query all files for bucket
- Return bucket data + file listing with urls

`PATCH /api/buckets/:id`:
- Authenticate as owner or admin
- Update allowed fields: name, description, expires_in
- Return updated bucket

`DELETE /api/buckets/:id`:
- Authenticate as owner or admin
- Delete files from disk via `deleteBucket()`
- Delete bucket from DB (cascades file rows)
- Return { deleted: true }

**Step 3: Test with curl**

```bash
KEY=$(curl -s -X POST http://localhost:3000/api/keys \
  -H "Authorization: Bearer dev-admin-key-change-me" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Agent"}' | jq -r '.key')

curl -s -X POST http://localhost:3000/api/buckets \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Bucket", "for": "Carbon", "expires_in": "1w"}' | jq .
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add bucket CRUD API endpoints"
```

---

### Task 9: File Upload Endpoint

**Files:**
- Create: `src/app/api/buckets/[id]/upload/route.ts`

**Step 1: Implement multipart upload**

`POST /api/buckets/:id/upload`:
- Authenticate as owner or admin
- Parse multipart form data
- For each file field: field name = file path (e.g. `reports/q1.csv`)
  - If field name is generic ("file", "files"), fall back to the File's `.name`
  - Sanitize path (remove `..`, leading `/`)
  - Detect MIME type from extension via `mime-types` package
  - Save to disk via `saveFile()`
  - Upsert file record in DB (delete existing + insert)
- Return array of uploaded file info with urls

**Step 2: Test with curl**

```bash
echo "Hello world" > /tmp/test.txt
curl -s -X POST http://localhost:3000/api/buckets/<ID>/upload \
  -H "Authorization: Bearer $KEY" \
  -F "hello.txt=@/tmp/test.txt" | jq .
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add multipart file upload endpoint with path-based field names"
```

---

### Task 10: File Delete Endpoint

**Files:**
- Create: `src/app/api/buckets/[id]/files/route.ts`

**Step 1: Implement DELETE /api/buckets/:id/files**

- Authenticate as owner or admin
- Read `{ path }` from body
- Look up file in DB
- Delete from disk + DB
- Return { deleted: true, path }

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add file delete endpoint"
```

---

### Task 11: Raw File Download Route

**Files:**
- Create: `src/app/raw/[bucket]/[...path]/route.ts`

**Step 1: Implement raw file streaming with cache headers**

`GET /raw/:bucket/:path+`:
- No auth (public)
- Look up bucket — if not found, 404
- If expired, 410 Gone + `Cache-Control: no-store`
- Look up file in DB — if not found, 404
- Read file from disk
- Set headers:
  - `Content-Type` from file's mime_type
  - `Content-Disposition: inline; filename="..."`
  - `Content-Length`
  - Cache-Control: permanent bucket → `public, max-age=31536000, immutable`; expiring → `public, max-age={seconds_remaining}`

**Step 2: Test**

```bash
curl -v http://localhost:3000/raw/<BUCKET_ID>/hello.txt
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add raw file download route with cache headers"
```

---

### Task 12: Content Negotiation Middleware

**Files:**
- Create: `src/middleware.ts`

**Step 1: Implement middleware**

Intercept requests to `/:bucket/:path+` (paths with 2+ segments, excluding `/raw/`, `/api/`, `/admin`, `/docs`, `/llms.txt`, `/_next/`):
- If `Accept` header does NOT include `text/html` → rewrite to `/raw/{bucket}/{path}`
- Otherwise → pass through to page.tsx

Root path (`/`) and single-segment paths (`/:bucket`) always pass through.

**Step 2: Test content negotiation**

```bash
# curl (no text/html) → raw file
curl -v http://localhost:3000/<BUCKET_ID>/hello.txt

# Browser simulation → HTML page
curl -v -H "Accept: text/html" http://localhost:3000/<BUCKET_ID>/hello.txt
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add content negotiation middleware for Accept header routing"
```

---

### Task 13: ZIP Download Endpoint

**Files:**
- Create: `src/app/api/buckets/[id]/zip/route.ts`

**Step 1: Implement ZIP streaming**

`GET /api/buckets/:id/zip`:
- No auth (public)
- Look up bucket, check not expired
- Query all files
- Use `archiver` to create ZIP stream
- Add each file from disk
- Stream response with `Content-Type: application/zip` and `Content-Disposition: attachment`

**Step 2: Test**

```bash
curl -o /tmp/test.zip http://localhost:3000/api/buckets/<ID>/zip
unzip -l /tmp/test.zip
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add ZIP download endpoint for entire buckets"
```

---

### Task 14: Admin Dashboard Link Endpoint

**Files:**
- Create: `src/app/api/admin/dashboard-link/route.ts`

**Step 1: Implement endpoint**

`GET /api/admin/dashboard-link`:
- Authenticate as admin
- Generate HMAC dashboard token (24h)
- Return `{ url: "{BASE_URL}/admin?token=...", expires_in: "24h" }`

**Step 2: Test**

```bash
curl -s http://localhost:3000/api/admin/dashboard-link \
  -H "Authorization: Bearer dev-admin-key-change-me" | jq .
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add admin dashboard link generation endpoint"
```

---

### Task 15: LLM-Friendly Endpoints

**Files:**
- Create: `src/app/api/buckets/[id]/summary/route.ts`
- Create: `src/app/llms.txt/route.ts`

**Step 1: Implement bucket summary**

`GET /api/buckets/:id/summary`:
- No auth (public)
- Look up bucket, check not expired
- Return plain text: bucket name, owner, for, description, file listing with sizes, README content if present

**Step 2: Implement llms.txt**

`GET /llms.txt`:
- Return plain text describing the platform, API endpoints, and usage

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add LLM-friendly endpoints (bucket summary, llms.txt)"
```

---

### Task 16: Expiry Cleanup

**Files:**
- Create: `src/instrumentation.ts`

**Step 1: Implement cleanup in instrumentation hook**

`instrumentation.ts` exports `register()` function:
- Only run server-side
- Query expired buckets (expires_at < now, expires_at IS NOT NULL)
- For each: delete bucket directory from disk, delete bucket from DB
- Log count of deleted buckets
- Run on startup, then every 15 minutes via setInterval

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add expiry cleanup via instrumentation hook"
```

---

## Phase 3: UI Foundation

### Task 17: Tailwind v4 Theme & Global Styles

Use the `frontend-design` skill for this task — invoke it for high-quality visual design.

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Step 1: Configure Abyssal Terminal theme in globals.css**

Set up CSS custom properties from design doc. Configure Tailwind v4's `@theme` directive. Import Google Fonts (Instrument Serif, JetBrains Mono). Geist Mono comes with Next.js.

Colors: `--bg: #06090f`, `--surface: #0d1520`, `--surface-hover: #111d2c`, `--border: #1a2d40`, `--accent: #22d3ee`, `--accent-warm: #f97316`, `--text: #e2e8f0`, `--text-muted: #64748b`

**Step 2: Update layout.tsx**

- HTML `lang="en"`, dark background `bg-[var(--bg)]`
- Font loading (Instrument Serif, Geist Mono)
- Basic structure with footer "Designed by Clawd"

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: configure Abyssal Terminal theme with Tailwind v4"
```

---

### Task 18: Install and Configure shadcn/ui

**Step 1: Initialize shadcn**

```bash
npx shadcn@latest init
```

**Step 2: Install needed components**

```bash
npx shadcn@latest add button card table badge dialog
```

**Step 3: Override shadcn CSS variables to match Abyssal Terminal palette**

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: install and configure shadcn/ui with Abyssal Terminal overrides"
```

---

### Task 19: Shared Components — Layout Shell & Footer

**Files:**
- Create: `src/components/page-shell.tsx`
- Create: `src/components/footer.tsx`

**Step 1: Build PageShell** — max-w-6xl centered container, min-h-screen flex column, footer pushed to bottom.

**Step 2: Build Footer** — "Designed by Clawd" with crab emoji, muted text, cyan glow on hover.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add page shell and footer components"
```

---

## Phase 4: Bucket & File Pages

### Task 20: Bucket View Page

Use the `frontend-design` skill for this task.

**Files:**
- Create: `src/app/[bucket]/page.tsx`
- Create: `src/components/file-tree.tsx`
- Create: `src/components/bucket-header.tsx`

**Step 1: Implement bucket page (Server Component)**

Receives `params.bucket`. Queries bucket + files from DB. Builds file tree from flat paths. Renders BucketHeader, FileTree, README if present.

**Step 2: Implement BucketHeader**

Metadata bar: bucket name, "by {owner} for {forField}", expiry badge, file count, "Download ZIP" button.

**Step 3: Implement FileTree**

GitHub-style table: icon, name, size, modified. Folders clickable. Breadcrumb navigation. Accept `path` search param for nested navigation.

**Step 4: Render README.md below file tree if present**

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add bucket view page with file tree and metadata bar"
```

---

### Task 21: Syntax Highlighting Setup (Shiki)

**Files:**
- Create: `src/lib/highlight.ts`

**Step 1: Install shiki**

```bash
npm install shiki
```

**Step 2: Create highlight utility**

Singleton Shiki highlighter (created once, reused). Support common languages. Map file extensions to Shiki language IDs. Use `github-dark` theme (close to Abyssal Terminal; can customize later).

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Shiki syntax highlighting utility"
```

---

### Task 22: Markdown Renderer

**Files:**
- Create: `src/lib/markdown.ts`
- Create: `src/components/markdown-renderer.tsx`

**Step 1: Install markdown libraries**

```bash
npm install unified remark-parse remark-gfm remark-rehype rehype-stringify rehype-raw
```

**Step 2: Create server-side markdown renderer**

Use unified pipeline: remark-parse → remark-gfm → remark-rehype → rehype-raw → rehype-stringify. Post-process to replace `<pre><code class="language-xxx">` blocks with Shiki-highlighted HTML.

**Step 3: Create MarkdownRenderer RSC**

Async server component that calls `renderMarkdown()` and renders via `dangerouslySetInnerHTML` with `prose prose-invert` classes.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add markdown renderer with Shiki-highlighted code blocks"
```

---

### Task 23: File Preview Page

Use the `frontend-design` skill for this task.

**Files:**
- Create: `src/app/[bucket]/[...path]/page.tsx`
- Create: `src/components/file-preview.tsx`
- Create: `src/components/preview/code-preview.tsx`
- Create: `src/components/preview/image-preview.tsx`
- Create: `src/components/preview/video-preview.tsx`
- Create: `src/components/preview/audio-preview.tsx`
- Create: `src/components/preview/csv-preview.tsx` (client component)
- Create: `src/components/preview/markdown-preview.tsx` (client component for toggle)
- Create: `src/components/preview/download-preview.tsx`

**Step 1: Implement file preview page (Server Component)**

Joins path segments, looks up bucket + file, determines preview type from MIME/extension, renders FilePreview wrapper + type-specific component.

**Step 2: FilePreview wrapper** — top bar with breadcrumb, file size, MIME badge, expiry, download button, raw button, curl command.

**Step 3: CodePreview** — server component, Shiki highlight, line numbers.

**Step 4: ImagePreview** — inline `<img src="/raw/...">`, centered, max-width.

**Step 5: VideoPreview** — `<video controls src="/raw/...">`.

**Step 6: AudioPreview** — `<audio controls src="/raw/...">`.

**Step 7: CsvPreview** — `"use client"`, parse CSV, shadcn Table, click-to-sort columns, limit to 1000 rows.

**Step 8: MarkdownPreview** — `"use client"`, receives rendered HTML + raw source, toggle button.

**Step 9: DownloadPreview** — fallback for unknown types, file icon, download button.

**Step 10: Commit**

```bash
git add -A
git commit -m "feat: add file preview page with type-specific renderers"
```

---

## Phase 5: Landing Page & Docs

### Task 24: Landing Page

Use the `frontend-design` skill for this task.

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Build landing page**

Hero with "Clawd Files" title, tagline, feature cards, code example showing curl workflow, "View API Docs" CTA. Clean dev-tool aesthetic, Abyssal Terminal palette.

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add landing page with branding and feature overview"
```

---

### Task 25: API Docs Page

Use the `frontend-design` skill for this task.

**Files:**
- Create: `src/app/docs/page.tsx`
- Create: `src/app/docs/api.md/route.ts`
- Create: `src/lib/api-docs.ts`

**Step 1: Create API docs content** — structured data for each endpoint in `src/lib/api-docs.ts`.

**Step 2: Build docs page** — Stripe-style layout with sidebar, method badges, request/response examples, copyable curl commands.

**Step 3: Build raw markdown endpoint** — `/docs/api.md` generates markdown from same data source.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add interactive API docs page and raw markdown endpoint"
```

---

## Phase 6: Admin Dashboard

### Task 26: Admin Dashboard

Use the `frontend-design` skill for this task.

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/components/admin/stats-cards.tsx`
- Create: `src/components/admin/keys-table.tsx` (client component)
- Create: `src/components/admin/buckets-table.tsx` (client component)

**Step 1: Build admin page** — verify HMAC token, query stats, render sections.

**Step 2: StatsCards** — total buckets, files, storage, active keys.

**Step 3: KeysTable** — client component, revoke via API proxy (server action or route that checks dashboard token).

**Step 4: BucketsTable** — client component, delete via same API proxy pattern.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add admin dashboard with stats, key management, and bucket management"
```

---

## Phase 7: OG Meta Tags

### Task 27: Dynamic OG Metadata

**Files:**
- Add `generateMetadata` to: `src/app/[bucket]/page.tsx`, `src/app/[bucket]/[...path]/page.tsx`
- Create: `src/app/api/og/[bucket]/route.tsx`
- Create: `src/app/api/og/[bucket]/[...path]/route.tsx`

**Step 1: Install @vercel/og**

```bash
npm install @vercel/og
```

**Step 2: Build generic OG card image** — branded card with Abyssal Terminal palette, file/bucket name, owner.

**Step 3: Add generateMetadata to bucket page** — title, description, og:image → /api/og/{id}.

**Step 4: Add generateMetadata to file page** — images use raw URL as og:image, videos use og:video, others use generic card.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add dynamic OG meta tags and branded OG card images"
```

---

## Phase 8: Polish & Docker

### Task 28: Favicon

**Files:**
- Create: `src/app/icon.tsx`

**Step 1: Create crab emoji favicon** using Next.js `icon.tsx` metadata convention with `ImageResponse`.

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add crab emoji favicon"
```

---

### Task 29: Dockerfile

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

**Step 1: Create .dockerignore** — node_modules, .next, data, .git

**Step 2: Create multi-stage Dockerfile** — deps → builder → runner (node:22-alpine)

**Step 3: Test Docker build**

```bash
docker build -t clawd-files .
docker run -p 3000:3000 -e ADMIN_API_KEY=test -e BASE_URL=http://localhost:3000 clawd-files
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Dockerfile with multi-stage build"
```

---

### Task 30: Final Integration Test

**Step 1: Run full workflow**

1. Create API key
2. Create bucket with expiry
3. Upload files (including nested paths and README.md)
4. View bucket page in browser
5. View file previews (markdown, code, image)
6. Download raw file via curl
7. Download ZIP
8. Test content negotiation (curl vs browser)
9. Generate admin dashboard link
10. Visit admin dashboard
11. Check llms.txt and bucket summary
12. Verify OG tags (share a link in Discord/Telegram or use og-image debugger)

**Step 2: Fix any issues found**

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final integration fixes"
```

---

## Summary

| Phase | Tasks | What's built |
|---|---|---|
| 1: Foundation | 1-6 | Scaffolding, DB, auth, storage, utils |
| 2: API Routes | 7-16 | All REST endpoints, middleware, cleanup |
| 3: UI Foundation | 17-19 | Theme, shadcn/ui, layout shell |
| 4: Bucket & Files | 20-23 | Bucket page, file tree, previews, markdown |
| 5: Landing & Docs | 24-25 | Landing page, API docs |
| 6: Admin | 26 | Admin dashboard |
| 7: OG Tags | 27 | Dynamic OG metadata + card images |
| 8: Polish & Docker | 28-30 | Favicon, Dockerfile, integration test |

**Total tasks: 30** — each maps to one focused commit.
