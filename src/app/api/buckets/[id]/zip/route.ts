import { db } from "@/lib/db";
import { buckets, files } from "@/lib/schema";
import { isExpired } from "@/lib/expiry";
import { jsonError, jsonNotFound } from "@/lib/response";
import { getFilePath } from "@/lib/storage";
import { eq } from "drizzle-orm";
import archiver from "archiver";
import { PassThrough, Readable } from "stream";

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Look up bucket
  const bucket = db.select().from(buckets).where(eq(buckets.id, id)).get();

  if (!bucket) {
    return jsonNotFound("Bucket not found", "This bucket does not exist.");
  }

  if (isExpired(bucket.expiresAt)) {
    return jsonError(
      "Bucket expired",
      "This bucket has expired and is no longer accessible.",
      410,
    );
  }

  // Query all files for this bucket
  const bucketFiles = db
    .select()
    .from(files)
    .where(eq(files.bucketId, id))
    .all();

  if (bucketFiles.length === 0) {
    return jsonNotFound(
      "No files",
      "This bucket has no files to download.",
    );
  }

  // Create ZIP archive
  const archive = archiver("zip", { zlib: { level: 6 } });
  const passthrough = new PassThrough();

  archive.pipe(passthrough);

  // Add each file to the archive
  for (const file of bucketFiles) {
    const filePath = getFilePath(id, file.path);
    archive.file(filePath, { name: file.path });
  }

  archive.finalize();

  // Convert Node.js Readable stream to Web ReadableStream
  const webStream = Readable.toWeb(passthrough) as ReadableStream;

  // Sanitize bucket name for filename
  const sanitizedName = bucket.name
    .replace(/[^a-zA-Z0-9_\-. ]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 100);

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${sanitizedName}.zip"`,
    },
  });
}
