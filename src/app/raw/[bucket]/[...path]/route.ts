import { db } from "@/lib/db";
import { buckets, files } from "@/lib/schema";
import { isExpired, secondsRemaining } from "@/lib/expiry";
import { jsonError, jsonNotFound } from "@/lib/response";
import { getFilePath } from "@/lib/storage";
import { eq, and } from "drizzle-orm";
import { readFileSync, existsSync } from "fs";
import { basename } from "path";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bucket: string; path: string[] }> },
) {
  const { bucket: bucketId, path: pathSegments } = await params;
  const filePath = pathSegments.join("/");

  // Look up bucket
  const bucket = db
    .select()
    .from(buckets)
    .where(eq(buckets.id, bucketId))
    .get();

  if (!bucket) {
    return jsonNotFound("Bucket not found", "This bucket does not exist.");
  }

  // Check expiry
  if (isExpired(bucket.expiresAt)) {
    return new Response(
      JSON.stringify({
        error: "Bucket expired",
        hint: "This bucket has expired and is no longer accessible.",
      }),
      {
        status: 410,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  // Look up file in DB
  const file = db
    .select()
    .from(files)
    .where(and(eq(files.bucketId, bucketId), eq(files.path, filePath)))
    .get();

  if (!file) {
    return jsonNotFound(
      "File not found",
      `No file at path '${filePath}' in this bucket.`,
    );
  }

  // Read file from disk
  const diskPath = getFilePath(bucketId, filePath);
  if (!existsSync(diskPath)) {
    return jsonError(
      "File missing",
      "The file record exists but the data is missing from storage.",
      500,
    );
  }

  const fileBuffer = readFileSync(diskPath);
  const fileName = basename(filePath);

  // Determine cache control
  let cacheControl: string;
  if (bucket.expiresAt === null) {
    cacheControl = "public, max-age=31536000, immutable";
  } else {
    const remaining = secondsRemaining(bucket.expiresAt);
    cacheControl = `public, max-age=${remaining}`;
  }

  return new Response(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Content-Length": String(file.size),
      "Cache-Control": cacheControl,
    },
  });
}
