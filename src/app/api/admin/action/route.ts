import { verifyDashboardToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiKeys, buckets } from "@/lib/schema";
import { deleteBucket } from "@/lib/storage";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

type ActionBody = {
  token: string;
  action: "revoke_key" | "delete_bucket";
  target: string;
};

export async function POST(request: Request) {
  let body: ActionBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", hint: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const { token, action, target } = body;

  if (!token || !action || !target) {
    return NextResponse.json(
      {
        error: "Missing fields",
        hint: "Provide token, action, and target in the request body.",
      },
      { status: 400 },
    );
  }

  if (!verifyDashboardToken(token)) {
    return NextResponse.json(
      {
        error: "Invalid or expired token",
        hint: "Generate a new dashboard link.",
      },
      { status: 401 },
    );
  }

  if (action === "revoke_key") {
    const existing = db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.prefix, target))
      .get();

    if (!existing) {
      return NextResponse.json(
        {
          error: "Key not found",
          hint: `No API key with prefix '${target}' exists.`,
        },
        { status: 404 },
      );
    }

    db.delete(apiKeys).where(eq(apiKeys.prefix, target)).run();

    return NextResponse.json({
      ok: true,
      action: "revoke_key",
      target,
      name: existing.name,
    });
  }

  if (action === "delete_bucket") {
    const existing = db
      .select()
      .from(buckets)
      .where(eq(buckets.id, target))
      .get();

    if (!existing) {
      return NextResponse.json(
        {
          error: "Bucket not found",
          hint: `No bucket with id '${target}' exists.`,
        },
        { status: 404 },
      );
    }

    // Delete files from disk
    await deleteBucket(target);

    // Delete bucket from DB (cascades to file rows)
    db.delete(buckets).where(eq(buckets.id, target)).run();

    return NextResponse.json({
      ok: true,
      action: "delete_bucket",
      target,
      name: existing.name,
    });
  }

  return NextResponse.json(
    {
      error: "Invalid action",
      hint: "Action must be 'revoke_key' or 'delete_bucket'.",
    },
    { status: 400 },
  );
}
