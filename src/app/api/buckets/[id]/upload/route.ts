import { Readable } from "node:stream";
import Busboy from "busboy";
import { db } from "@/lib/db";
import { buckets, files } from "@/lib/schema";
import { authenticate, AuthError } from "@/lib/auth";
import { jsonSuccess, jsonError, jsonNotFound } from "@/lib/response";
import { isExpired } from "@/lib/expiry";
import { saveFileStream } from "@/lib/storage";
import { fileUrl } from "@/lib/urls";
import { lookup } from "mime-types";
import { eq, and } from "drizzle-orm";

export const runtime = 'nodejs';

// Override MIME types that the `mime-types` library gets wrong.
// Notably, .ts is detected as video/mp2t (MPEG-2 Transport Stream).
const MIME_OVERRIDES: Record<string, string> = {
  ".ts": "text/typescript",
  ".tsx": "text/typescript-jsx",
  ".mts": "text/typescript",
  ".cts": "text/typescript",
};

const GENERIC_FIELD_NAMES = new Set(["file", "files", "upload", "uploads", "blob"]);

function sanitizePath(raw: string): string {
  // Remove leading slashes, collapse doubles, trim whitespace
  return raw
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/\/+/g, "/");
}

type UploadedFile = {
  path: string;
  size: number;
  mime_type: string;
  url: string;
  raw_url: string;
  api_url: string;
};

/**
 * Parse multipart form data using busboy (streaming).
 * Files are written directly to disk — no in-memory buffering of file bodies.
 */
function parseMultipart(
  body: ReadableStream<Uint8Array>,
  contentType: string,
  bucketId: string,
): Promise<UploadedFile[]> {
  return new Promise((resolve, reject) => {
    const uploaded: UploadedFile[] = [];
    const filePromises: Promise<void>[] = [];
    const now = Math.floor(Date.now() / 1000);

    const bb = Busboy({
      headers: { "content-type": contentType },
      limits: { fileSize: Infinity },
    });

    bb.on("file", (fieldName: string, stream: Readable, info: { filename: string }) => {
      let filePath: string;
      if (GENERIC_FIELD_NAMES.has(fieldName.toLowerCase())) {
        filePath = info.filename || fieldName;
      } else {
        filePath = fieldName;
      }

      filePath = sanitizePath(filePath);
      if (!filePath || filePath === "." || filePath === "..") {
        stream.resume(); // drain the stream
        return;
      }

      const ext = "." + filePath.split(".").pop()?.toLowerCase();
      const mimeType =
        MIME_OVERRIDES[ext] ?? (lookup(filePath) || "application/octet-stream");

      const promise = saveFileStream(bucketId, filePath, stream).then(
        (size) => {
          // Upsert: delete existing file record, then insert new one
          db.delete(files)
            .where(and(eq(files.bucketId, bucketId), eq(files.path, filePath)))
            .run();

          db.insert(files)
            .values({
              bucketId,
              path: filePath,
              size,
              mimeType,
              createdAt: now,
            })
            .run();

          const urls = fileUrl(bucketId, filePath);
          uploaded.push({
            path: filePath,
            size,
            mime_type: mimeType,
            ...urls,
          });
        },
      );

      filePromises.push(promise);
    });

    bb.on("close", () => {
      Promise.all(filePromises).then(() => resolve(uploaded)).catch(reject);
    });

    bb.on("error", reject);

    // Pipe the web ReadableStream into busboy via a Node.js Readable
    Readable.fromWeb(body as import("node:stream/web").ReadableStream).pipe(bb);
  });
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
