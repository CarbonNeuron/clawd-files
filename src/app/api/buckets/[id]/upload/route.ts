import { db } from "@/lib/db";
import { buckets, files } from "@/lib/schema";
import { authenticate, AuthError } from "@/lib/auth";
import { jsonSuccess, jsonError, jsonNotFound } from "@/lib/response";
import { isExpired } from "@/lib/expiry";
import { saveFile } from "@/lib/storage";
import { fileUrl } from "@/lib/urls";
import { lookup } from "mime-types";
import { eq, and } from "drizzle-orm";

const GENERIC_FIELD_NAMES = new Set(["file", "files", "upload", "uploads", "blob"]);

function sanitizePath(raw: string): string {
  // Remove leading slashes, collapse doubles, trim whitespace
  return raw
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/\/+/g, "/");
}

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
        "You can only upload to buckets you own.",
        403,
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return jsonError(
        "Invalid form data",
        "Request must be multipart/form-data with at least one file field.",
        400,
      );
    }

    const uploaded: Array<{
      path: string;
      size: number;
      mime_type: string;
      url: string;
      raw_url: string;
      api_url: string;
    }> = [];

    const now = Math.floor(Date.now() / 1000);

    for (const [fieldName, value] of formData.entries()) {
      if (!(value instanceof File)) continue;

      // Determine file path: use field name unless it's generic
      let filePath: string;
      if (GENERIC_FIELD_NAMES.has(fieldName.toLowerCase())) {
        filePath = value.name || fieldName;
      } else {
        filePath = fieldName;
      }

      filePath = sanitizePath(filePath);
      if (!filePath || filePath === "." || filePath === "..") {
        continue; // Skip invalid paths
      }

      const buffer = Buffer.from(await value.arrayBuffer());
      const mimeType = lookup(filePath) || "application/octet-stream";

      await saveFile(id, filePath, buffer);

      // Upsert: delete existing file record, then insert new one
      db.delete(files)
        .where(and(eq(files.bucketId, id), eq(files.path, filePath)))
        .run();

      db.insert(files)
        .values({
          bucketId: id,
          path: filePath,
          size: buffer.length,
          mimeType,
          createdAt: now,
        })
        .run();

      const urls = fileUrl(id, filePath);
      uploaded.push({
        path: filePath,
        size: buffer.length,
        mime_type: mimeType,
        ...urls,
      });
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
