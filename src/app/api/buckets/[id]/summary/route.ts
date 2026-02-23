import { db } from "@/lib/db";
import { buckets, files } from "@/lib/schema";
import { isExpired } from "@/lib/expiry";
import { getFileBuffer } from "@/lib/storage";
import { eq } from "drizzle-orm";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const bucket = db.select().from(buckets).where(eq(buckets.id, id)).get();
  if (!bucket || isExpired(bucket.expiresAt)) {
    return new Response("Bucket not found or expired.\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const bucketFiles = db
    .select()
    .from(files)
    .where(eq(files.bucketId, id))
    .all();

  const lines: string[] = [];

  lines.push(`# ${bucket.name}`);
  lines.push(`Owner: ${bucket.owner}`);
  if (bucket.forField) {
    lines.push(`For: ${bucket.forField}`);
  }
  if (bucket.description) {
    lines.push(`Description: ${bucket.description}`);
  }
  lines.push(`Files: ${bucketFiles.length}`);
  lines.push("");

  lines.push("## File Listing");
  for (const f of bucketFiles) {
    lines.push(`- ${f.path} (${formatSize(f.size)}, ${f.mimeType})`);
  }

  // Check for README.md
  const readmeFile = bucketFiles.find(
    (f) => f.path.toLowerCase() === "readme.md",
  );
  if (readmeFile) {
    const readmeBuffer = getFileBuffer(id, readmeFile.path);
    if (readmeBuffer) {
      lines.push("");
      lines.push("## README");
      lines.push(readmeBuffer.toString("utf-8"));
    }
  }

  lines.push("");

  return new Response(lines.join("\n"), {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
