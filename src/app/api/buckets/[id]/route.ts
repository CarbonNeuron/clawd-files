import { db } from "@/lib/db";
import { buckets, files } from "@/lib/schema";
import { authenticate, AuthError } from "@/lib/auth";
import { jsonSuccess, jsonError, jsonNotFound } from "@/lib/response";
import { isExpired, parseExpiry } from "@/lib/expiry";
import { bucketUrl, fileUrl } from "@/lib/urls";
import { deleteBucket } from "@/lib/storage";
import { eq } from "drizzle-orm";

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const bucket = db.select().from(buckets).where(eq(buckets.id, id)).get();
  if (!bucket || isExpired(bucket.expiresAt)) {
    return jsonNotFound(
      "Bucket not found",
      "This bucket does not exist or has expired.",
    );
  }

  const bucketFiles = db
    .select()
    .from(files)
    .where(eq(files.bucketId, id))
    .all();

  return jsonSuccess({
    id: bucket.id,
    name: bucket.name,
    owner: bucket.owner,
    description: bucket.description,
    for: bucket.forField,
    created_at: bucket.createdAt,
    expires_at: bucket.expiresAt,
    ...bucketUrl(bucket.id),
    files: bucketFiles.map((f) => ({
      path: f.path,
      size: f.size,
      mime_type: f.mimeType,
      created_at: f.createdAt,
      ...fileUrl(bucket.id, f.path),
    })),
  });
}

export async function PATCH(
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
        "You can only modify buckets you own.",
        403,
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(
        "Invalid JSON",
        "Request body must be valid JSON.",
        400,
      );
    }

    const { name, description, expires_in } = body as Record<string, unknown>;

    const updates: Record<string, unknown> = {};
    if (typeof name === "string" && name.trim().length > 0) {
      updates.name = name.trim();
    }
    if (typeof description === "string") {
      updates.description = description.trim() || null;
    }
    if (typeof expires_in === "string") {
      updates.expiresAt = parseExpiry(expires_in);
    }

    if (Object.keys(updates).length === 0) {
      return jsonError(
        "No updates",
        "Provide at least one field to update: name, description, or expires_in.",
        400,
      );
    }

    db.update(buckets).set(updates).where(eq(buckets.id, id)).run();

    const updated = db.select().from(buckets).where(eq(buckets.id, id)).get()!;

    return jsonSuccess({
      id: updated.id,
      name: updated.name,
      owner: updated.owner,
      description: updated.description,
      for: updated.forField,
      created_at: updated.createdAt,
      expires_at: updated.expiresAt,
      ...bucketUrl(updated.id),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.message, err.hint, err.status);
    }
    throw err;
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticate(request);
    const { id } = await params;

    const bucket = db.select().from(buckets).where(eq(buckets.id, id)).get();
    if (!bucket) {
      return jsonNotFound(
        "Bucket not found",
        "This bucket does not exist.",
      );
    }

    if (auth.type !== "admin" && auth.keyHash !== bucket.keyHash) {
      return jsonError(
        "Forbidden",
        "You can only delete buckets you own.",
        403,
      );
    }

    // Delete files from disk
    await deleteBucket(id);

    // Delete bucket from DB (cascades to file rows)
    db.delete(buckets).where(eq(buckets.id, id)).run();

    return jsonSuccess({ deleted: true, id });
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.message, err.hint, err.status);
    }
    throw err;
  }
}
