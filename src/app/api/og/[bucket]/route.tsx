import { ImageResponse } from "@vercel/og";
import { db } from "@/lib/db";
import { buckets, files } from "@/lib/schema";
import { isExpired } from "@/lib/expiry";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bucket: string }> }
) {
  const { bucket: bucketId } = await params;

  const bucket = db
    .select()
    .from(buckets)
    .where(eq(buckets.id, bucketId))
    .get();

  if (!bucket || isExpired(bucket.expiresAt)) {
    return new Response("Not found", { status: 404 });
  }

  const fileCount = db
    .select()
    .from(files)
    .where(eq(files.bucketId, bucketId))
    .all().length;

  const fileLabel = `${fileCount} ${fileCount === 1 ? "file" : "files"}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px",
          background: "linear-gradient(135deg, #06090f 0%, #0d1520 100%)",
          color: "#e2e8f0",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 24,
            color: "#22d3ee",
          }}
        >
          Clawd Files
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 700,
              textAlign: "center",
              lineHeight: 1.2,
              maxWidth: "100%",
              overflow: "hidden",
            }}
          >
            {bucket.name}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: "#94a3b8",
              marginTop: 16,
            }}
          >
            {`by ${bucket.owner}`}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            fontSize: 22,
            color: "#64748b",
          }}
        >
          {fileLabel}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
