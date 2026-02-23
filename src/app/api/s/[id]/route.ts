import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buckets, files } from "@/lib/schema";
import { isExpired } from "@/lib/expiry";
import { jsonNotFound } from "@/lib/response";
import { encodePath } from "@/lib/urls";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: shortId } = await params;

  const file = db
    .select()
    .from(files)
    .where(eq(files.shortId, shortId))
    .get();

  if (!file) {
    return jsonNotFound("Not found", "No file with this short ID.");
  }

  const bucket = db
    .select()
    .from(buckets)
    .where(eq(buckets.id, file.bucketId))
    .get();

  if (!bucket || isExpired(bucket.expiresAt)) {
    return jsonNotFound("Not found", "This file's bucket has expired.");
  }

  const url = new URL(request.url);
  url.pathname = `/raw/${file.bucketId}/${encodePath(file.path)}`;
  return NextResponse.redirect(url, 307);
}
