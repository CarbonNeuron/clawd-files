import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { buckets, files } from "@/lib/schema";
import { isExpired } from "@/lib/expiry";
import { getFileBuffer } from "@/lib/storage";
import { encodePath } from "@/lib/urls";
import { renderMarkdown } from "@/lib/markdown";
import { eq, and } from "drizzle-orm";
import { correctMimeType } from "@/lib/mime";
import { extname } from "node:path";
import { PageShell } from "@/components/page-shell";
import { FilePreview } from "@/components/file-preview";
import { CodePreview } from "@/components/preview/code-preview";
import { ImagePreview } from "@/components/preview/image-preview";
import { VideoPreview } from "@/components/preview/video-preview";
import { AudioPreview } from "@/components/preview/audio-preview";
import { CsvPreview } from "@/components/preview/csv-preview";
import { MarkdownPreview } from "@/components/preview/markdown-preview";
import { DownloadPreview } from "@/components/preview/download-preview";

export const runtime = 'nodejs';

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const OG_IMAGE_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg",
]);

const OG_VIDEO_EXTENSIONS = new Set([".mp4", ".webm"]);

const OG_AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".ogg"]);

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bucket: string; path: string[] }>;
}): Promise<Metadata> {
  const { bucket: bucketId, path: pathSegments } = await params;
  const filePath = pathSegments.map(decodeURIComponent).join("/");

  const bucket = db
    .select()
    .from(buckets)
    .where(eq(buckets.id, bucketId))
    .get();

  if (!bucket || isExpired(bucket.expiresAt)) {
    return { title: "Not Found" };
  }

  const file = db
    .select()
    .from(files)
    .where(and(eq(files.bucketId, bucketId), eq(files.path, filePath)))
    .get();

  if (!file) {
    return { title: "Not Found" };
  }

  const fileName = getFileName(filePath);
  const ext = extname(filePath).toLowerCase();
  const mimeType = correctMimeType(filePath, file.mimeType);
  const description = `${mimeType} · ${formatSize(file.size)} — in ${bucket.name}`;
  const rawUrl = `${BASE_URL}/raw/${bucketId}/${encodePath(filePath)}`;
  const ogCardUrl = `${BASE_URL}/api/og/${bucketId}/${encodePath(filePath)}`;

  const metadata: Metadata = {
    title: fileName,
    description,
    openGraph: {
      title: fileName,
      description,
    },
  };

  if (OG_IMAGE_EXTENSIONS.has(ext)) {
    // For images: use the raw image as the OG image
    metadata.openGraph!.images = [
      {
        url: rawUrl,
        alt: fileName,
      },
    ];
  } else if (OG_VIDEO_EXTENSIONS.has(ext)) {
    // For videos: OG video + generic card as image
    metadata.openGraph!.videos = [
      {
        url: rawUrl,
      },
    ];
    metadata.openGraph!.images = [
      {
        url: ogCardUrl,
        width: 1200,
        height: 630,
        alt: fileName,
      },
    ];
  } else if (OG_AUDIO_EXTENSIONS.has(ext)) {
    // For audio: OG audio + generic card as image
    metadata.openGraph!.audio = [
      {
        url: rawUrl,
      },
    ];
    metadata.openGraph!.images = [
      {
        url: ogCardUrl,
        width: 1200,
        height: 630,
        alt: fileName,
      },
    ];
  } else {
    // Everything else: generic OG card
    metadata.openGraph!.images = [
      {
        url: ogCardUrl,
        width: 1200,
        height: 630,
        alt: fileName,
      },
    ];
  }

  return metadata;
}

// Extensions that should be rendered as code
const CODE_EXTENSIONS = new Set([
  ".js", ".ts", ".jsx", ".tsx", ".py", ".rb", ".rs", ".go", ".java",
  ".c", ".cpp", ".cs", ".h", ".sh", ".sql", ".json", ".yaml", ".yml", ".toml",
  ".xml", ".html", ".css", ".php", ".ini", ".diff", ".dockerfile",
  ".txt", ".log", ".env", ".conf", ".cfg", ".md",
]);

const IMAGE_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".ico", ".bmp",
]);

const VIDEO_EXTENSIONS = new Set([".mp4", ".webm"]);

const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".ogg", ".flac"]);

type PreviewType = "markdown" | "csv" | "image" | "video" | "audio" | "code" | "download";

function detectPreviewType(filePath: string, mimeType: string): PreviewType {
  const ext = extname(filePath).toLowerCase();

  if (ext === ".md") return "markdown";
  if (ext === ".csv") return "csv";
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  if (AUDIO_EXTENSIONS.has(ext)) return "audio";
  if (CODE_EXTENSIONS.has(ext)) return "code";
  if (mimeType.startsWith("text/")) return "code";

  return "download";
}

export default async function FilePreviewPage({
  params,
}: {
  params: Promise<{ bucket: string; path: string[] }>;
}) {
  const { bucket: bucketId, path: pathSegments } = await params;
  const filePath = pathSegments.map(decodeURIComponent).join("/");

  // Look up bucket
  const bucket = db
    .select()
    .from(buckets)
    .where(eq(buckets.id, bucketId))
    .get();

  if (!bucket || isExpired(bucket.expiresAt)) {
    notFound();
  }

  // Look up file
  const file = db
    .select()
    .from(files)
    .where(and(eq(files.bucketId, bucketId), eq(files.path, filePath)))
    .get();

  if (!file) {
    notFound();
  }

  const mimeType = correctMimeType(filePath, file.mimeType);
  const previewType = detectPreviewType(filePath, mimeType);

  // Read text content for text-based previews
  let textContent: string | null = null;
  if (previewType === "code" || previewType === "markdown" || previewType === "csv") {
    const buffer = getFileBuffer(bucketId, filePath);
    if (buffer) {
      textContent = buffer.toString("utf-8");
    }
  }

  // Pre-render markdown HTML for the markdown preview
  let markdownHtml: string | null = null;
  if (previewType === "markdown" && textContent) {
    markdownHtml = await renderMarkdown(textContent);
  }

  return (
    <PageShell>
      <FilePreview
        bucketId={bucket.id}
        bucketName={bucket.name}
        filePath={filePath}
        mimeType={mimeType}
        size={file.size}
        expiresAt={bucket.expiresAt}
      >
        {previewType === "code" && textContent !== null && (
          <CodePreview content={textContent} filePath={filePath} />
        )}

        {previewType === "image" && (
          <ImagePreview bucketId={bucket.id} filePath={filePath} />
        )}

        {previewType === "video" && (
          <VideoPreview bucketId={bucket.id} filePath={filePath} />
        )}

        {previewType === "audio" && (
          <AudioPreview bucketId={bucket.id} filePath={filePath} />
        )}

        {previewType === "csv" && textContent !== null && (
          <CsvPreview content={textContent} />
        )}

        {previewType === "markdown" && textContent !== null && markdownHtml !== null && (
          <MarkdownPreview renderedHtml={markdownHtml} rawSource={textContent} />
        )}

        {previewType === "download" && (
          <DownloadPreview
            bucketId={bucket.id}
            filePath={filePath}
            mimeType={mimeType}
            size={file.size}
          />
        )}
      </FilePreview>
    </PageShell>
  );
}
