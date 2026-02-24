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
import { MIME_OVERRIDES } from "@/lib/mime";
import { eq, and } from "drizzle-orm";

export const runtime = 'nodejs';

const GENERIC_FIELD_NAMES = new Set(["file", "files", "upload", "uploads", "blob"]);

/**
 * Busboy decodes Content-Disposition filenames as Latin-1 per RFC 2047.
 * Most clients (curl, browsers) send raw UTF-8 bytes without using the
 * RFC 5987 filename* syntax, so emoji/multibyte chars get mojibake'd.
 * Detect this and re-decode: Latin-1 string → raw bytes → UTF-8 string.
 */
function fixUtf8(name: string): string {
  // If the string already has characters above the Latin-1 range (> 0xFF),
  // it was correctly decoded (e.g. via filename*=UTF-8'') — return as-is.
  if (/[^\x00-\xFF]/.test(name)) {
    return name;
  }
  // Re-interpret the Latin-1 code points as raw bytes, then decode as UTF-8.
  const decoded = Buffer.from(name, "latin1").toString("utf-8");
  // If UTF-8 decoding produced replacement characters, the original was
  // genuinely Latin-1 (e.g. accented chars) — keep the original.
  if (decoded.includes("\uFFFD")) {
    return name;
  }
  return decoded;
}

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
      const fixedFieldName = fixUtf8(fieldName);
      const fixedFilename = fixUtf8(info.filename);

      let filePath: string;
      if (GENERIC_FIELD_NAMES.has(fixedFieldName.toLowerCase())) {
        filePath = fixedFilename || fixedFieldName;
      } else {
        filePath = fixedFieldName;
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
