import { db } from "@/lib/db";
import { buckets, files } from "@/lib/schema";
import { authenticate, AuthError } from "@/lib/auth";
import { jsonSuccess, jsonError, jsonNotFound } from "@/lib/response";
import { isExpired } from "@/lib/expiry";
import { deleteFile } from "@/lib/storage";
import { eq, and } from "drizzle-orm";

export async function DELETE(
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
        "You can only delete files from buckets you own.",
        403,
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(
        "Invalid JSON",
        "Request body must be valid JSON with a 'path' field.",
        400,
      );
    }

    const { path } = body as Record<string, unknown>;
    if (!path || typeof path !== "string" || path.trim().length === 0) {
      return jsonError(
        "Missing path",
        "Provide a non-empty 'path' string identifying the file to delete.",
        400,
      );
    }

    const cleanPath = path.trim().replace(/^\/+/, "");

    const file = db
      .select()
      .from(files)
      .where(and(eq(files.bucketId, id), eq(files.path, cleanPath)))
      .get();

    if (!file) {
      return jsonNotFound(
        "File not found",
        `No file at path '${cleanPath}' in this bucket.`,
      );
    }

    // Delete from disk
    await deleteFile(id, cleanPath);

    // Delete from DB
    db.delete(files)
      .where(and(eq(files.bucketId, id), eq(files.path, cleanPath)))
      .run();

    return jsonSuccess({ deleted: true, path: cleanPath });
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.message, err.hint, err.status);
    }
    throw err;
  }
}
