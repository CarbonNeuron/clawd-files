import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { buckets } from "@/lib/schema";
import { authenticate, AuthError } from "@/lib/auth";
import { jsonSuccess, jsonError } from "@/lib/response";
import { parseExpiry, isExpired } from "@/lib/expiry";
import { bucketUrl } from "@/lib/urls";
import { eq, or, isNull, gt, sql } from "drizzle-orm";

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const auth = await authenticate(request);
    if (auth.type === "admin") {
      return jsonError(
        "Forbidden",
        "Use an LLM API key to create buckets, not the admin key.",
        403,
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(
        "Invalid JSON",
        "Request body must be valid JSON with at least a 'name' field.",
        400,
      );
    }

    const { name, description, for: forField, expires_in } =
      body as Record<string, unknown>;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return jsonError(
        "Missing name",
        "Provide a non-empty 'name' string in the request body.",
        400,
      );
    }

    const id = nanoid(10);
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = parseExpiry(
      typeof expires_in === "string" ? expires_in : undefined,
    );

    db.insert(buckets)
      .values({
        id,
        name: (name as string).trim(),
        keyHash: auth.keyHash,
        owner: auth.name,
        description:
          typeof description === "string" ? description.trim() : null,
        forField: typeof forField === "string" ? forField.trim() : null,
        createdAt: now,
        expiresAt,
      })
      .run();

    const urls = bucketUrl(id);

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
    const now = Math.floor(Date.now() / 1000);

    const notExpired = or(isNull(buckets.expiresAt), gt(buckets.expiresAt, now));

    let rows;
    if (auth.type === "admin") {
      rows = db
        .select()
        .from(buckets)
        .where(notExpired)
        .all();
    } else {
      rows = db
        .select()
        .from(buckets)
        .where(sql`${notExpired} AND ${buckets.keyHash} = ${auth.keyHash}`)
        .all();
    }

    return jsonSuccess({
      buckets: rows.map((b) => ({
        id: b.id,
        name: b.name,
        owner: b.owner,
        description: b.description,
        for: b.forField,
        created_at: b.createdAt,
        expires_at: b.expiresAt,
        ...bucketUrl(b.id),
      })),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.message, err.hint, err.status);
    }
    throw err;
  }
}
