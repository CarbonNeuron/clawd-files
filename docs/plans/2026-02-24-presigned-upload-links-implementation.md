# Pre-Signed Upload Links Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow LLMs to generate time-limited upload URLs that humans can open in a browser to upload files to a specific bucket without needing an API key.

**Architecture:** Stateless HMAC-signed tokens encoding `bucketId:expiresAt`, signed with `ADMIN_API_KEY`. New API endpoint to generate tokens, extended upload endpoint to accept token auth, and a browser-based drag-and-drop upload page.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Node.js crypto (HMAC-SHA256), Tailwind v4, existing Busboy multipart parsing.

---

### Task 1: Upload Token Generation & Verification

**Files:**
- Modify: `src/lib/auth.ts:63-96` (add after existing dashboard token functions)
- Test: `src/lib/__tests__/auth.test.ts`

**Step 1: Write failing tests for upload token generation and verification**

Add to `src/lib/__tests__/auth.test.ts`:

```typescript
import {
  authenticate,
  generateDashboardToken,
  verifyDashboardToken,
  generateUploadToken,
  verifyUploadToken,
} from "../auth";

// ... existing tests ...

describe("upload tokens", () => {
  it("generates and verifies a valid token for a bucket", () => {
    const result = verifyUploadToken(generateUploadToken("testbucket"));
    expect(result).toEqual({ bucketId: "testbucket" });
  });

  it("rejects tampered token", () => {
    expect(verifyUploadToken("tampered.token")).toBeNull();
  });

  it("rejects expired token", () => {
    const token = generateUploadToken("testbucket", -1);
    expect(verifyUploadToken(token)).toBeNull();
  });

  it("returns correct bucket ID from token", () => {
    const result = verifyUploadToken(generateUploadToken("abc123defg"));
    expect(result).toEqual({ bucketId: "abc123defg" });
  });

  it("rejects token with modified bucket ID", () => {
    const token = generateUploadToken("bucket-a");
    // Decode, modify, re-encode — signature won't match
    const decoded = Buffer.from(token, "base64url").toString();
    const modified = decoded.replace("bucket-a", "bucket-b");
    const reEncoded = Buffer.from(modified).toString("base64url");
    expect(verifyUploadToken(reEncoded)).toBeNull();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/auth.test.ts`
Expected: FAIL — `generateUploadToken` and `verifyUploadToken` are not exported.

**Step 3: Implement `generateUploadToken` and `verifyUploadToken`**

Add to `src/lib/auth.ts` after the `verifyDashboardToken` function (after line 96):

```typescript
export function generateUploadToken(bucketId: string, validHours: number = 1): string {
  const adminKey = process.env.ADMIN_API_KEY!;
  const expiresAt = Math.floor(Date.now() / 1000) + validHours * 3600;
  const payload = `${bucketId}:${expiresAt}`;
  const signature = createHmac("sha256", adminKey)
    .update(payload)
    .digest("hex");
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

export function verifyUploadToken(token: string): { bucketId: string } | null {
  try {
    const adminKey = process.env.ADMIN_API_KEY;
    if (!adminKey) return null;

    const decoded = Buffer.from(token, "base64url").toString();
    const dotIndex = decoded.lastIndexOf(".");
    if (dotIndex === -1) return null;

    const payload = decoded.slice(0, dotIndex);
    const signature = decoded.slice(dotIndex + 1);

    const colonIndex = payload.lastIndexOf(":");
    if (colonIndex === -1) return null;

    const bucketId = payload.slice(0, colonIndex);
    const expiresAt = parseInt(payload.slice(colonIndex + 1), 10);

    if (!bucketId || isNaN(expiresAt)) return null;
    if (expiresAt < Math.floor(Date.now() / 1000)) return null;

    const expected = createHmac("sha256", adminKey)
      .update(payload)
      .digest("hex");

    if (signature.length !== expected.length) return null;
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

    return { bucketId };
  } catch {
    return null;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/auth.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/lib/auth.ts src/lib/__tests__/auth.test.ts
git commit -m "feat: add upload token generation and verification"
```

---

### Task 2: Expiry Parsing Helper

The existing `parseExpiry()` in `src/lib/expiry.ts` returns an absolute Unix timestamp, but the upload-link endpoint needs the number of hours for `generateUploadToken()`. Add a helper that converts an expiry preset string to hours.

**Files:**
- Modify: `src/lib/expiry.ts`

**Step 1: Add `expiryToHours` function**

Add to the end of `src/lib/expiry.ts`:

```typescript
const EXPIRY_HOURS: Record<string, number> = {
  "1h": 1,
  "6h": 6,
  "12h": 12,
  "1d": 24,
  "3d": 72,
  "1w": 168,
  "2w": 336,
  "1m": 720,
};

/**
 * Convert an expiry preset string to hours. Returns 1 (hour) as default.
 * Used for upload token expiry (not bucket expiry).
 */
export function expiryToHours(input?: string): number {
  if (!input) return 1;
  const hours = EXPIRY_HOURS[input];
  if (hours !== undefined) return hours;
  const num = parseInt(input, 10);
  if (!isNaN(num) && num > 0) return num / 3600;
  return 1;
}
```

**Step 2: Commit**

```bash
git add src/lib/expiry.ts
git commit -m "feat: add expiryToHours helper for upload token expiry"
```

---

### Task 3: Upload Link Generation Endpoint

**Files:**
- Create: `src/app/api/buckets/[id]/upload-link/route.ts`

**Step 1: Create the route handler**

Create `src/app/api/buckets/[id]/upload-link/route.ts`:

```typescript
import { db } from "@/lib/db";
import { buckets } from "@/lib/schema";
import { authenticate, AuthError, generateUploadToken } from "@/lib/auth";
import { jsonSuccess, jsonError, jsonNotFound } from "@/lib/response";
import { isExpired } from "@/lib/expiry";
import { expiryToHours } from "@/lib/expiry";
import { eq } from "drizzle-orm";

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticate(request);
    const { id } = await params;

    const bucket = db.select().from(buckets).where(eq(buckets.id, id)).get();
    if (!bucket || isExpired(bucket.expiresAt)) {
      return jsonNotFound(
        "Bucket not found",
        "This bucket does not exist or has expired.",
      );
    }

    if (auth.type !== "admin" && auth.keyHash !== bucket.keyHash) {
      return jsonError(
        "Forbidden",
        "You can only generate upload links for buckets you own.",
        403,
      );
    }

    let expiresIn = "1h";
    try {
      const body = await request.json();
      if (typeof body.expires_in === "string") {
        expiresIn = body.expires_in;
      }
    } catch {
      // No body or invalid JSON is fine — use defaults
    }

    const hours = expiryToHours(expiresIn);
    const token = generateUploadToken(id, hours);
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";

    return jsonSuccess({
      upload_url: `${baseUrl}/upload/${id}?token=${token}`,
      expires_in: expiresIn,
      bucket: {
        id: bucket.id,
        name: bucket.name,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.message, err.hint, err.status);
    }
    throw err;
  }
}
```

**Step 2: Verify manually or write a test**

Run the dev server and test with curl:
```bash
curl -X POST http://localhost:3000/api/buckets/<bucket_id>/upload-link \
  -H "Authorization: Bearer <api_key>" \
  -H "Content-Type: application/json" \
  -d '{"expires_in": "1h"}'
```

Expected: 200 with `upload_url`, `expires_in`, and `bucket` fields.

**Step 3: Commit**

```bash
git add src/app/api/buckets/\[id\]/upload-link/route.ts
git commit -m "feat: add POST /api/buckets/:id/upload-link endpoint"
```

---

### Task 4: Extend Upload Route to Accept Token Auth

**Files:**
- Modify: `src/app/api/buckets/[id]/upload/route.ts:138-205`

**Step 1: Modify the upload POST handler**

In `src/app/api/buckets/[id]/upload/route.ts`, replace the existing `POST` function (lines 138-205) with a version that checks for a `?token=` query param before falling back to `authenticate()`:

Add import at the top of the file:
```typescript
import { authenticate, AuthError, verifyUploadToken } from "@/lib/auth";
```
(Replace the existing import that only imports `authenticate` and `AuthError`.)

Replace the `POST` function body. The key change is in the auth section (the multipart parsing stays the same):

```typescript
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Check for upload token in query params
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    let authorized = false;

    if (token) {
      const result = verifyUploadToken(token);
      if (!result) {
        return jsonError(
          "Invalid or expired upload token",
          "The upload link has expired or is invalid. Request a new one.",
          401,
        );
      }
      if (result.bucketId !== id) {
        return jsonError(
          "Token mismatch",
          "This upload token is not valid for this bucket.",
          403,
        );
      }
      authorized = true;
    }

    if (!authorized) {
      const auth = await authenticate(request);
      const bucket = db.select().from(buckets).where(eq(buckets.id, id)).get();
      if (!bucket || isExpired(bucket.expiresAt)) {
        return jsonNotFound(
          "Bucket not found",
          "This bucket does not exist or has expired.",
        );
      }
      if (auth.type !== "admin" && auth.keyHash !== bucket.keyHash) {
        return jsonError(
          "Forbidden",
          "You can only upload to buckets you own.",
          403,
        );
      }
    }

    if (!authorized) {
      // This branch can't be reached but satisfies the type checker
      return jsonError("Unauthorized", "Authentication required.", 401);
    }

    // For token auth, still check the bucket exists and isn't expired
    const bucket = db.select().from(buckets).where(eq(buckets.id, id)).get();
    if (!bucket || isExpired(bucket.expiresAt)) {
      return jsonNotFound(
        "Bucket not found",
        "This bucket does not exist or has expired.",
      );
    }

    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("multipart/form-data")) {
      return jsonError(
        "Invalid content type",
        "Request must be multipart/form-data.",
        400,
      );
    }

    if (!request.body) {
      return jsonError(
        "No body",
        "Request body is empty.",
        400,
      );
    }

    let uploaded: UploadedFile[];
    try {
      uploaded = await parseMultipart(request.body, contentType, id);
    } catch {
      return jsonError(
        "Invalid form data",
        "Failed to parse multipart form data.",
        400,
      );
    }

    if (uploaded.length === 0) {
      return jsonError(
        "No files uploaded",
        "Include at least one file field in the multipart form data.",
        400,
      );
    }

    return jsonSuccess({ uploaded }, 201);
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.message, err.hint, err.status);
    }
    throw err;
  }
}
```

**Note on the refactored logic:** The flow is:
1. If `?token=` exists, verify it and set `authorized = true`.
2. If no token, fall back to `authenticate()` (API key auth) which checks ownership.
3. Either way, verify bucket exists and isn't expired before proceeding to upload.

A cleaner approach (to avoid the redundant bucket lookup) is to restructure as:

```typescript
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Auth: token OR API key
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (token) {
      const result = verifyUploadToken(token);
      if (!result) {
        return jsonError(
          "Invalid or expired upload token",
          "The upload link has expired or is invalid. Request a new one.",
          401,
        );
      }
      if (result.bucketId !== id) {
        return jsonError(
          "Token mismatch",
          "This upload token is not valid for this bucket.",
          403,
        );
      }
    } else {
      const auth = await authenticate(request);
      // Ownership check needs bucket, so do it below
      const bucket = db.select().from(buckets).where(eq(buckets.id, id)).get();
      if (!bucket || isExpired(bucket.expiresAt)) {
        return jsonNotFound(
          "Bucket not found",
          "This bucket does not exist or has expired.",
        );
      }
      if (auth.type !== "admin" && auth.keyHash !== bucket.keyHash) {
        return jsonError(
          "Forbidden",
          "You can only upload to buckets you own.",
          403,
        );
      }
    }

    // Verify bucket exists (for both auth paths)
    const bucket = db.select().from(buckets).where(eq(buckets.id, id)).get();
    if (!bucket || isExpired(bucket.expiresAt)) {
      return jsonNotFound(
        "Bucket not found",
        "This bucket does not exist or has expired.",
      );
    }

    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("multipart/form-data")) {
      return jsonError(
        "Invalid content type",
        "Request must be multipart/form-data.",
        400,
      );
    }

    if (!request.body) {
      return jsonError("No body", "Request body is empty.", 400);
    }

    let uploaded: UploadedFile[];
    try {
      uploaded = await parseMultipart(request.body, contentType, id);
    } catch {
      return jsonError(
        "Invalid form data",
        "Failed to parse multipart form data.",
        400,
      );
    }

    if (uploaded.length === 0) {
      return jsonError(
        "No files uploaded",
        "Include at least one file field in the multipart form data.",
        400,
      );
    }

    return jsonSuccess({ uploaded }, 201);
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.message, err.hint, err.status);
    }
    throw err;
  }
}
```

Use this second version — it's cleaner. The duplicate bucket lookup for the API key path is harmless (one extra read from SQLite).

**Step 2: Run existing tests**

Run: `npx vitest run`
Expected: ALL PASS (no existing upload tests, but ensure nothing broke)

**Step 3: Commit**

```bash
git add src/app/api/buckets/\[id\]/upload/route.ts
git commit -m "feat: accept upload token auth via ?token= query param"
```

---

### Task 5: Extend Bucket Creation to Optionally Generate Upload Link

**Files:**
- Modify: `src/app/api/buckets/route.ts:12-87`

**Step 1: Modify the POST handler**

In `src/app/api/buckets/route.ts`, add imports:
```typescript
import { generateUploadToken } from "@/lib/auth";
import { expiryToHours } from "@/lib/expiry";
```

In the POST handler, after the existing bucket creation and before the return, add the upload link generation:

After the `db.insert(buckets).values(...)` block and before the `return jsonSuccess(...)`, add:

```typescript
    // Optionally generate an upload link
    let uploadUrl: string | undefined;
    if (body && (body as Record<string, unknown>).generate_upload_link) {
      const uploadExpiresIn =
        typeof (body as Record<string, unknown>).upload_link_expires_in === "string"
          ? ((body as Record<string, unknown>).upload_link_expires_in as string)
          : "1h";
      const hours = expiryToHours(uploadExpiresIn);
      const token = generateUploadToken(id, hours);
      const baseUrl = process.env.BASE_URL || "http://localhost:3000";
      uploadUrl = `${baseUrl}/upload/${id}?token=${token}`;
    }
```

Then modify the return to include `upload_url` when present:

```typescript
    return jsonSuccess(
      {
        id,
        name: (name as string).trim(),
        owner: auth.name,
        description:
          typeof description === "string" ? description.trim() : null,
        for: typeof forField === "string" ? forField.trim() : null,
        created_at: now,
        expires_at: expiresAt,
        ...urls,
        ...(uploadUrl ? { upload_url: uploadUrl } : {}),
      },
      201,
    );
```

**Step 2: Commit**

```bash
git add src/app/api/buckets/route.ts
git commit -m "feat: optionally generate upload link on bucket creation"
```

---

### Task 6: Browser Upload Page

**Files:**
- Create: `src/app/upload/[bucket]/page.tsx`
- Create: `src/components/upload-form.tsx`

This is the most complex task. The page has a server component wrapper (validates token, fetches bucket info) and a client component for the drag-and-drop upload UI.

**Step 1: Create the server page component**

Create `src/app/upload/[bucket]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { buckets } from "@/lib/schema";
import { verifyUploadToken } from "@/lib/auth";
import { isExpired } from "@/lib/expiry";
import { eq } from "drizzle-orm";
import { PageShell } from "@/components/page-shell";
import { UploadForm } from "@/components/upload-form";

export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: "Upload Files — Clawd Files",
  description: "Upload files to a shared bucket",
};

export default async function UploadPage({
  params,
  searchParams,
}: {
  params: Promise<{ bucket: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { bucket: bucketId } = await params;
  const { token } = await searchParams;

  // Validate token
  if (!token) {
    return (
      <PageShell>
        <ErrorMessage
          title="Missing upload token"
          hint="This upload link is incomplete. Ask the sender for a new link."
        />
      </PageShell>
    );
  }

  const result = verifyUploadToken(token);
  if (!result) {
    return (
      <PageShell>
        <ErrorMessage
          title="Invalid or expired upload link"
          hint="This upload link has expired or is invalid. Ask the sender for a new link."
        />
      </PageShell>
    );
  }

  if (result.bucketId !== bucketId) {
    return (
      <PageShell>
        <ErrorMessage
          title="Invalid upload link"
          hint="This upload link does not match this bucket."
        />
      </PageShell>
    );
  }

  // Check bucket exists
  const bucket = db.select().from(buckets).where(eq(buckets.id, bucketId)).get();
  if (!bucket || isExpired(bucket.expiresAt)) {
    return (
      <PageShell>
        <ErrorMessage
          title="Bucket not found"
          hint="This bucket does not exist or has expired."
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-heading font-semibold text-text mb-2">
            Upload to {bucket.name}
          </h1>
          <p className="text-sm text-text-muted font-code">
            by {bucket.owner}
          </p>
        </div>

        <UploadForm bucketId={bucketId} token={token} />
      </div>
    </PageShell>
  );
}

function ErrorMessage({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="py-24 text-center">
      <div className="inline-block rounded-lg border border-border bg-surface p-8 max-w-md">
        <h1 className="text-lg font-heading font-semibold text-accent-warm mb-2">
          {title}
        </h1>
        <p className="text-sm text-text-muted">{hint}</p>
      </div>
    </div>
  );
}
```

**Step 2: Create the client upload form component**

Create `src/components/upload-form.tsx`:

```tsx
"use client";

import { useState, useRef, useCallback } from "react";

type UploadedFile = {
  path: string;
  size: number;
  mime_type: string;
  url: string;
  raw_url: string;
};

type UploadState = "idle" | "uploading" | "done" | "error";

export function UploadForm({
  bucketId,
  token,
}: {
  bucketId: string;
  token: string;
}) {
  const [state, setState] = useState<UploadState>("idle");
  const [uploaded, setUploaded] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      setState("uploading");
      setError("");
      setProgress(0);

      const formData = new FormData();
      for (const file of fileArray) {
        formData.append("files", file);
      }

      try {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `/api/buckets/${bucketId}/upload?token=${token}`);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        const response = await new Promise<{ ok: boolean; status: number; body: string }>(
          (resolve, reject) => {
            xhr.onload = () =>
              resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, body: xhr.responseText });
            xhr.onerror = () => reject(new Error("Network error"));
            xhr.send(formData);
          },
        );

        if (!response.ok) {
          const data = JSON.parse(response.body);
          setError(data.error || "Upload failed");
          setState("error");
          return;
        }

        const data = JSON.parse(response.body);
        setUploaded((prev) => [...prev, ...data.uploaded]);
        setState("done");
      } catch {
        setError("Upload failed. Please try again.");
        setState("error");
      }
    },
    [bucketId, token],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        upload(e.dataTransfer.files);
      }
    },
    [upload],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        upload(e.target.files);
      }
    },
    [upload],
  );

  const resetForMore = () => {
    setState("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  return (
    <div>
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => state !== "uploading" && inputRef.current?.click()}
        className={`
          relative rounded-lg border-2 border-dashed p-12 text-center cursor-pointer
          transition-all duration-200
          ${dragOver
            ? "border-accent bg-accent/5 glow-cyan"
            : "border-border hover:border-accent/40 hover:bg-surface/50"
          }
          ${state === "uploading" ? "pointer-events-none opacity-70" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {state === "uploading" ? (
          <div>
            <div className="text-sm text-text-muted font-code mb-4">
              Uploading... {progress}%
            </div>
            <div className="w-full max-w-xs mx-auto h-1 rounded-full bg-border overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div>
            <div className="text-4xl mb-4 opacity-30">
              {dragOver ? "+" : "^"}
            </div>
            <p className="text-sm text-text-muted font-code">
              Drop files here or click to browse
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {state === "error" && (
        <div className="mt-4 rounded-lg border border-accent-warm/30 bg-accent-warm/5 p-4">
          <p className="text-sm text-accent-warm font-code">{error}</p>
          <button onClick={resetForMore} className="btn btn-outline btn-sm mt-3">
            Try again
          </button>
        </div>
      )}

      {/* Success — upload more */}
      {state === "done" && (
        <div className="mt-4 text-center">
          <button onClick={resetForMore} className="btn btn-outline btn-sm">
            Upload more files
          </button>
        </div>
      )}

      {/* Uploaded files list */}
      {uploaded.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-heading font-semibold text-text-muted mb-3 uppercase tracking-wider">
            Uploaded Files
          </h2>
          <div className="rounded-lg border border-border overflow-hidden">
            {uploaded.map((file, i) => (
              <a
                key={`${file.path}-${i}`}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 hover:bg-surface-hover transition-colors border-b border-border last:border-b-0"
              >
                <span className="text-sm font-code text-accent truncate">
                  {file.path}
                </span>
                <span className="text-xs text-text-muted font-code ml-4 shrink-0">
                  {formatSize(file.size)}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Verify in the browser**

1. Start the dev server: `npm run dev`
2. Create a bucket and generate an upload link via the API
3. Open the upload URL in a browser
4. Verify: drag-and-drop works, file picker works, files appear in the uploaded list
5. Verify: expired tokens show the error page
6. Verify: missing tokens show the error page

**Step 4: Commit**

```bash
git add src/app/upload/\[bucket\]/page.tsx src/components/upload-form.tsx
git commit -m "feat: add browser upload page with drag-and-drop"
```

---

### Task 7: Update API Documentation

**Files:**
- Modify: `src/lib/api-docs.ts`
- Modify: `src/app/llms.txt/route.ts`

**Step 1: Add upload-link endpoint to api-docs.ts**

In `src/lib/api-docs.ts`, in the `"Files"` endpoint group (around line 192), add a new endpoint after the existing upload endpoint:

```typescript
      {
        method: "POST",
        path: "/api/buckets/:id/upload-link",
        description:
          'Generate a pre-signed upload URL for a bucket. The URL can be shared with anyone — they can upload files by opening it in a browser (drag-and-drop UI) or via curl, without needing an API key. The link expires after the specified duration.\n\nRequest body fields:\n- **expires_in** (string, optional): Expiry preset. Presets: 1h, 6h, 12h, 1d, 3d, 1w. Defaults to **1 hour** (1h) if omitted.',
        auth: "owner",
        requestBody: { expires_in: "1h" },
        responseExample: {
          upload_url: `${BASE}/upload/abc123defg?token=eyJ...`,
          expires_in: "1h",
          bucket: { id: "abc123defg", name: "my-project" },
        },
        curl: `curl -X POST ${BASE}/api/buckets/abc123defg/upload-link \\\n  -H "Authorization: Bearer $API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"expires_in": "1h"}'`,
      },
```

Also update the existing upload endpoint description (around line 199-201) to mention token auth:

```typescript
        description:
          'Upload files via multipart/form-data. Accepts multiple files in a single request.\n\n**Auth:** Owner/admin via API key, OR a valid upload token via `?token=` query param (from the upload-link endpoint).\n\nThe form field name determines the file path: use a generic name (file, files, upload, uploads, blob) to keep the original filename, or set the field name to a custom path (e.g. "src/main.rs") to override it. Re-uploading the same path overwrites the existing file.',
```

**Step 2: Update the bucket creation endpoint docs**

In the Buckets group, update the `POST /api/buckets` description to mention the new fields:

Add to the description string (after the expires_in line):
```
- **generate_upload_link** (boolean, optional): If true, generates a pre-signed upload URL and includes it as `upload_url` in the response.
- **upload_link_expires_in** (string, optional): Expiry for the upload link. Same presets as expires_in. Defaults to 1h.
```

Update the request body example:
```typescript
        requestBody: {
          name: "my-project",
          description: "Project source files",
          for: "code-review",
          expires_in: "1w",
          generate_upload_link: true,
          upload_link_expires_in: "1h",
        },
```

Update the response example to include `upload_url`:
```typescript
        responseExample: {
          id: "abc123defg",
          name: "my-project",
          owner: "claude-agent",
          description: "Project source files",
          for: "code-review",
          created_at: 1700000000,
          expires_at: 1700604800,
          url: `${BASE}/abc123defg`,
          api_url: `${BASE}/api/buckets/abc123defg`,
          upload_url: `${BASE}/upload/abc123defg?token=eyJ...`,
        },
```

**Step 3: Update llms.txt**

In `src/app/llms.txt/route.ts`, add the upload-link section. After the Files section (after the DELETE files curl example, around line 208), add:

```
---

### Upload Links

#### POST ${baseUrl}/api/buckets/{id}/upload-link
Generate a pre-signed upload URL for a bucket. Share this URL with anyone — they can upload files by opening it in a browser (drag-and-drop UI) or via curl, without needing an API key.

Request body fields:
- expires_in (string, optional): Expiry preset. Presets: 1h, 6h, 12h, 1d, 3d, 1w. Default: 1 hour (1h).

    curl -X POST ${baseUrl}/api/buckets/abc123defg/upload-link \\
      -H "Authorization: Bearer $API_KEY" \\
      -H "Content-Type: application/json" \\
      -d '{"expires_in": "1h"}'

Response (200):

    {
      "upload_url": "${baseUrl}/upload/abc123defg?token=...",
      "expires_in": "1h",
      "bucket": {"id": "abc123defg", "name": "my-project"}
    }

You can also generate an upload link when creating a bucket by including generate_upload_link: true:

    curl -X POST ${baseUrl}/api/buckets \\
      -H "Authorization: Bearer $API_KEY" \\
      -H "Content-Type: application/json" \\
      -d '{"name": "my-project", "generate_upload_link": true, "upload_link_expires_in": "1h"}'

The upload URL also accepts direct multipart POST requests (for curl/programmatic use):

    curl -X POST "${baseUrl}/api/buckets/abc123defg/upload?token=TOKEN_HERE" \\
      -F "files=@screenshot.png"
```

Also update the upload section to mention token auth:
```
#### POST ${baseUrl}/api/buckets/{id}/upload
Upload files via multipart/form-data.

**Auth:** Owner/admin via API key, OR a valid upload token via ?token= query param.
```

**Step 4: Commit**

```bash
git add src/lib/api-docs.ts src/app/llms.txt/route.ts
git commit -m "docs: add upload link endpoints to API docs and llms.txt"
```

---

### Task 8: Final Verification

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

**Step 2: Build check**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors.

**Step 3: End-to-end manual test**

1. Start dev server: `npm run dev`
2. Create an API key: `curl -X POST http://localhost:3000/api/keys -H "Authorization: Bearer $ADMIN_KEY" -H "Content-Type: application/json" -d '{"name":"test"}'`
3. Create a bucket with upload link: `curl -X POST http://localhost:3000/api/buckets -H "Authorization: Bearer $API_KEY" -H "Content-Type: application/json" -d '{"name":"test-upload","generate_upload_link":true}'`
4. Open the `upload_url` in a browser — verify drag-and-drop UI appears
5. Upload a file via browser — verify success
6. Upload a file via curl with token — verify success
7. Generate upload link for existing bucket: `curl -X POST http://localhost:3000/api/buckets/<id>/upload-link -H "Authorization: Bearer $API_KEY"`
8. Open `/llms.txt` — verify upload link docs appear
9. Open `/docs` — verify upload link docs appear
10. Wait for token to expire (or use a short expiry like `"1h"` and modify the token) — verify expired token shows error page

**Step 4: Final commit (if any adjustments needed)**

```bash
git add -A
git commit -m "fix: adjustments from end-to-end testing"
```
