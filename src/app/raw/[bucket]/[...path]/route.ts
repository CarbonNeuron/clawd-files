import { db } from "@/lib/db";
import { buckets, files } from "@/lib/schema";
import { isExpired, secondsRemaining } from "@/lib/expiry";
import { jsonError, jsonNotFound } from "@/lib/response";
import { getFilePath } from "@/lib/storage";
import { eq, and } from "drizzle-orm";
import { createReadStream, existsSync, statSync } from "node:fs";
import { basename } from "node:path";
import { Readable } from "node:stream";

export const runtime = 'nodejs';

/**
 * Parse a Range header like "bytes=0-1023" or "bytes=500-".
 * Returns [start, end] (inclusive) or null if unparseable.
 */
function parseRange(header: string, fileSize: number): [number, number] | null {
  const match = header.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;

  let start: number;
  let end: number;

  if (match[1] === "" && match[2] !== "") {
    // Suffix range: bytes=-500 means last 500 bytes
    const suffix = parseInt(match[2], 10);
    start = Math.max(0, fileSize - suffix);
    end = fileSize - 1;
  } else if (match[1] !== "" && match[2] === "") {
    // Open-ended: bytes=500-
    start = parseInt(match[1], 10);
    end = fileSize - 1;
  } else if (match[1] !== "" && match[2] !== "") {
    start = parseInt(match[1], 10);
    end = parseInt(match[2], 10);
  } else {
    return null;
  }

  if (start > end || start >= fileSize) return null;
  end = Math.min(end, fileSize - 1);
  return [start, end];
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bucket: string; path: string[] }> },
) {
  const { bucket: bucketId, path: pathSegments } = await params;
  const filePath = pathSegments.map(decodeURIComponent).join("/");

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

  const diskPath = getFilePath(bucketId, filePath);
  if (!existsSync(diskPath)) {
    return jsonError(
      "File missing",
      "The file record exists but the data is missing from storage.",
      500,
    );
  }

  const fileSize = statSync(diskPath).size;
  const fileName = basename(filePath);

  // Determine cache control
  let cacheControl: string;
  if (bucket.expiresAt === null) {
    cacheControl = "public, max-age=31536000, immutable";
  } else {
    const remaining = secondsRemaining(bucket.expiresAt);
    cacheControl = `public, max-age=${remaining}`;
  }

  // RFC 5987 filename* for non-ASCII filenames
  const isAscii = /^[\x20-\x7E]*$/.test(fileName);
  const disposition = isAscii
    ? `inline; filename="${fileName}"`
    : `inline; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;

  const commonHeaders: Record<string, string> = {
    "Content-Type": file.mimeType,
    "Content-Disposition": disposition,
    "Accept-Ranges": "bytes",
    "Cache-Control": cacheControl,
  };

  // Check for Range header
  const rangeHeader = request.headers.get("range");
  if (rangeHeader) {
    const range = parseRange(rangeHeader, fileSize);
    if (!range) {
      return new Response("Range Not Satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      });
    }

    const [start, end] = range;
    const chunkSize = end - start + 1;
    const stream = createReadStream(diskPath, { start, end });
    const webStream = Readable.toWeb(stream) as ReadableStream;

    return new Response(webStream, {
      status: 206,
      headers: {
        ...commonHeaders,
        "Content-Length": String(chunkSize),
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      },
    });
  }

  // No Range — stream the full file
  const stream = createReadStream(diskPath);
  const webStream = Readable.toWeb(stream) as ReadableStream;

  return new Response(webStream, {
    status: 200,
    headers: {
      ...commonHeaders,
      "Content-Length": String(fileSize),
    },
  });
}
