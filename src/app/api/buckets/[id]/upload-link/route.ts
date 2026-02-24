import { db } from "@/lib/db";
import { buckets } from "@/lib/schema";
import { authenticate, AuthError, generateUploadToken } from "@/lib/auth";
import { jsonSuccess, jsonError, jsonNotFound } from "@/lib/response";
import { isExpired, expiryToHours } from "@/lib/expiry";
import { eq } from "drizzle-orm";

export const runtime = 'nodejs';

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
        "You can only generate upload links for buckets you own.",
        403,
      );
    }

    let expiresIn = "1h";
    try {
      const body = await request.json();
      if (typeof body.expires_in === "string") {
        expiresIn = body.expires_in;
      }
    } catch {
      // No body or invalid JSON is fine — use defaults
    }

    const hours = expiryToHours(expiresIn);
    const token = generateUploadToken(id, hours);
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";

    return jsonSuccess({
      upload_url: `${baseUrl}/upload/${id}?token=${token}`,
      expires_in: expiresIn,
      bucket: {
        id: bucket.id,
        name: bucket.name,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.message, err.hint, err.status);
    }
    throw err;
  }
}
