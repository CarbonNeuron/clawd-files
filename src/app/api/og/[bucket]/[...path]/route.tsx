import { ImageResponse } from "@vercel/og";
import { db } from "@/lib/db";
import { buckets, files } from "@/lib/schema";
import { isExpired } from "@/lib/expiry";
import { eq, and } from "drizzle-orm";

export const runtime = "nodejs";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getFileName(filePath: string): string {
  const parts = filePath.split("/");
  return parts[parts.length - 1];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bucket: string; path: string[] }> }
) {
  const { bucket: bucketId, path: pathSegments } = await params;
  const filePath = pathSegments.join("/");

  const bucket = db
    .select()
    .from(buckets)
    .where(eq(buckets.id, bucketId))
    .get();

  if (!bucket || isExpired(bucket.expiresAt)) {
    return new Response("Not found", { status: 404 });
  }

  const file = db
    .select()
    .from(files)
    .where(and(eq(files.bucketId, bucketId), eq(files.path, filePath)))
    .get();

  if (!file) {
    return new Response("Not found", { status: 404 });
  }

  const fileName = getFileName(filePath);
  const subtitle = `${file.mimeType} · ${formatSize(file.size)}`;

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
              fontSize: 52,
              fontWeight: 700,
              textAlign: "center",
              lineHeight: 1.2,
              maxWidth: "100%",
              overflow: "hidden",
            }}
          >
            {fileName}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              color: "#94a3b8",
              marginTop: 16,
            }}
          >
            {subtitle}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            fontSize: 22,
            color: "#94a3b8",
          }}
        >
          {bucket.name}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
