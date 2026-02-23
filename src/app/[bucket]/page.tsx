import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { buckets, files } from "@/lib/schema";
import { isExpired } from "@/lib/expiry";
import { eq } from "drizzle-orm";
import { PageShell } from "@/components/page-shell";
import { BucketHeader } from "@/components/bucket-header";
import { FileTree, type FileEntry } from "@/components/file-tree";
import { getFileBuffer } from "@/lib/storage";
import { MarkdownRenderer } from "@/components/markdown-renderer";

export const runtime = 'nodejs';

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bucket: string }>;
}): Promise<Metadata> {
  const { bucket: bucketId } = await params;

  const bucket = db
    .select()
    .from(buckets)
    .where(eq(buckets.id, bucketId))
    .get();

  if (!bucket || isExpired(bucket.expiresAt)) {
    return { title: "Not Found" };
  }

  const fileCount = db
    .select()
    .from(files)
    .where(eq(files.bucketId, bucketId))
    .all().length;

  const description = [
    `${fileCount} ${fileCount === 1 ? "file" : "files"} by ${bucket.owner}`,
    bucket.description,
  ]
    .filter(Boolean)
    .join(" — ");

  return {
    title: bucket.name,
    description,
    openGraph: {
      title: bucket.name,
      description,
      images: [
        {
          url: `${BASE_URL}/api/og/${bucketId}`,
          width: 1200,
          height: 630,
          alt: bucket.name,
        },
      ],
    },
  };
}

export default async function BucketPage({
  params,
  searchParams,
}: {
  params: Promise<{ bucket: string }>;
  searchParams: Promise<{ path?: string }>;
}) {
  const { bucket: bucketId } = await params;
  const { path: currentPath } = await searchParams;

  // Look up bucket
  const bucket = db
    .select()
    .from(buckets)
    .where(eq(buckets.id, bucketId))
    .get();

  if (!bucket || isExpired(bucket.expiresAt)) {
    notFound();
  }

  // Query all files for the bucket
  const bucketFiles = db
    .select()
    .from(files)
    .where(eq(files.bucketId, bucketId))
    .all();

  const fileEntries: FileEntry[] = bucketFiles.map((f) => ({
    path: f.path,
    size: f.size,
    mimeType: f.mimeType,
    createdAt: f.createdAt,
  }));

  // Check for README.md at the current directory level
  const normalizedPath = currentPath || "";
  const readmePath = normalizedPath ? `${normalizedPath}README.md` : "README.md";
  const hasReadme = bucketFiles.some((f) => f.path === readmePath);
  let readmeContent: string | null = null;

  if (hasReadme) {
    const buffer = getFileBuffer(bucketId, readmePath);
    if (buffer) {
      readmeContent = buffer.toString("utf-8");
    }
  }

  return (
    <PageShell>
      <BucketHeader
        id={bucket.id}
        name={bucket.name}
        owner={bucket.owner}
        forField={bucket.forField}
        expiresAt={bucket.expiresAt}
        fileCount={bucketFiles.length}
      />

      <FileTree
        bucketId={bucket.id}
        bucketName={bucket.name}
        files={fileEntries}
        currentPath={normalizedPath}
      />

      {readmeContent && (
        <div className="mt-8 rounded-lg border border-border p-6">
          <h2 className="font-heading text-lg text-text-muted mb-4">
            README.md
          </h2>
          <MarkdownRenderer source={readmeContent} />
        </div>
      )}
    </PageShell>
  );
}
