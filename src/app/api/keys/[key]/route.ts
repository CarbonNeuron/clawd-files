import { db } from "@/lib/db";
import { apiKeys } from "@/lib/schema";
import { authenticate, AuthError } from "@/lib/auth";
import { jsonSuccess, jsonError, jsonNotFound } from "@/lib/response";
import { eq } from "drizzle-orm";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const auth = await authenticate(request);
    if (auth.type !== "admin") {
      return jsonError("Forbidden", "Only admins can delete API keys.", 403);
    }

    const { key: prefix } = await params;

    const existing = db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.prefix, prefix))
      .get();

    if (!existing) {
      return jsonNotFound(
        "Key not found",
        `No API key with prefix '${prefix}' exists.`,
      );
    }

    db.delete(apiKeys).where(eq(apiKeys.prefix, prefix)).run();

    return jsonSuccess({ deleted: true, prefix, name: existing.name });
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.message, err.hint, err.status);
    }
    throw err;
  }
}
