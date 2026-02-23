import { randomBytes, createHash } from "crypto";
import { db } from "@/lib/db";
import { apiKeys, buckets } from "@/lib/schema";
import { authenticate, AuthError } from "@/lib/auth";
import { jsonSuccess, jsonError } from "@/lib/response";
import { eq, sql, count } from "drizzle-orm";

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const auth = await authenticate(request);
    if (auth.type !== "admin") {
      return jsonError("Forbidden", "Only admins can create API keys.", 403);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(
        "Invalid JSON",
        "Request body must be valid JSON with a 'name' field.",
        400,
      );
    }

    const { name } = body as Record<string, unknown>;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return jsonError(
        "Missing name",
        "Provide a non-empty 'name' string in the request body.",
        400,
      );
    }

    const rawKey = "cf_" + randomBytes(32).toString("hex");
    const hash = createHash("sha256").update(rawKey).digest("hex");
    const prefix = rawKey.slice(0, 8);
    const now = Math.floor(Date.now() / 1000);

    db.insert(apiKeys)
      .values({
        key: hash,
        prefix,
        name: name.trim(),
        createdAt: now,
        lastUsedAt: now,
      })
      .run();

    return jsonSuccess(
      {
        key: rawKey,
        prefix,
        name: name.trim(),
        created_at: now,
      },
      201,
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.message, err.hint, err.status);
    }
    throw err;
  }
}

export async function GET(request: Request) {
  try {
    const auth = await authenticate(request);
    if (auth.type !== "admin") {
      return jsonError("Forbidden", "Only admins can list API keys.", 403);
    }

    const bucketCounts = db
      .select({
        keyHash: buckets.keyHash,
        bucketCount: count().as("bucket_count"),
      })
      .from(buckets)
      .groupBy(buckets.keyHash)
      .as("bucket_counts");

    const keys = db
      .select({
        prefix: apiKeys.prefix,
        name: apiKeys.name,
        createdAt: apiKeys.createdAt,
        lastUsedAt: apiKeys.lastUsedAt,
        bucketCount: sql<number>`coalesce(${bucketCounts.bucketCount}, 0)`,
      })
      .from(apiKeys)
      .leftJoin(bucketCounts, eq(apiKeys.key, bucketCounts.keyHash))
      .all();

    return jsonSuccess({
      keys: keys.map((k) => ({
        prefix: k.prefix,
        name: k.name,
        created_at: k.createdAt,
        last_used_at: k.lastUsedAt,
        bucket_count: k.bucketCount,
      })),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.message, err.hint, err.status);
    }
    throw err;
  }
}
