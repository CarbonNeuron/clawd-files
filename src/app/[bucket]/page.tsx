import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { buckets, files } from "@/lib/schema";
import { isExpired } from "@/lib/expiry";
import { encodePath } from "@/lib/urls";
import { eq } from "drizzle-orm";
import { PageShell } from "@/components/page-shell";
import { BucketHeader } from "@/components/bucket-header";
import { FileTree, type FileEntry } from "@/components/file-tree";
import { getFileBuffer } from "@/lib/storage";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Bone } from "@/components/skeleton";

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

  // If the bucket has exactly one file, redirect to it
  if (bucketFiles.length === 1 && !currentPath) {
    redirect(`/${bucketId}/${encodePath(bucketFiles[0].path)}`);
  }

  const fileEntries: FileEntry[] = bucketFiles.map((f) => ({
    path: f.path,
    size: f.size,
    mimeType: f.mimeType,
    createdAt: f.createdAt,
  }));

  const normalizedPath = currentPath || "";

  const cookieStore = await cookies();
  const viewPref = cookieStore.get("clawd-view")?.value;
  const initialView = viewPref === "grid" ? "grid" : "list";

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
        initialView={initialView}
      />

      <Suspense
        fallback={
          <div className="mt-8 rounded-lg border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-bg/30">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent-warm/50 animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-accent/25 animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-border animate-pulse" />
              </div>
              <span className="ml-1 text-[11px] text-text-muted/60 font-code">README.md</span>
            </div>
            <div className="p-6 space-y-3">
              <Bone className="h-4 w-3/4" />
              <Bone className="h-4 w-1/2" />
              <Bone className="h-4 w-5/6" />
              <Bone className="h-4 w-2/3" />
            </div>
          </div>
        }
      >
        <ReadmeSection bucketId={bucketId} currentPath={normalizedPath} />
      </Suspense>
    </PageShell>
  );
}

async function ReadmeSection({
  bucketId,
  currentPath,
}: {
  bucketId: string;
  currentPath: string;
}) {
  const readmePath = currentPath ? `${currentPath}README.md` : "README.md";

  const file = db
    .select()
    .from(files)
    .where(eq(files.bucketId, bucketId))
    .all()
    .find((f) => f.path === readmePath);

  if (!file) return null;

  const buffer = getFileBuffer(bucketId, readmePath);
  if (!buffer) return null;

  const readmeContent = buffer.toString("utf-8");

  return (
    <div className="mt-8 rounded-lg border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-bg/30">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-accent-warm/50" />
          <span className="w-2 h-2 rounded-full bg-accent/25" />
          <span className="w-2 h-2 rounded-full bg-border" />
        </div>
        <span className="ml-1 text-[11px] text-text-muted/60 font-code">README.md</span>
      </div>
      <div className="p-6">
        <MarkdownRenderer source={readmeContent} basePath={`/${bucketId}/${currentPath}`} />
      </div>
    </div>
  );
}
