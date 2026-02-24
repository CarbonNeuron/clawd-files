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

  if (rawKey.length === adminKey.length) {
    const a = Buffer.from(rawKey);
    const b = Buffer.from(adminKey);
    if (timingSafeEqual(a, b)) {
      return { type: "admin" };
    }
  }

  const hash = createHash("sha256").update(rawKey).digest("hex");
  const key = db.select().from(apiKeys).where(eq(apiKeys.key, hash)).get();

  if (!key) {
    throw new AuthError(
      "Invalid API key",
      "Check your API key. It may have been revoked.",
    );
  }

  const now = Math.floor(Date.now() / 1000);
  db.update(apiKeys)
    .set({ lastUsedAt: now })
    .where(eq(apiKeys.key, hash))
    .run();

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
