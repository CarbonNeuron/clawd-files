import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { buckets, files } from "@/lib/schema";
import { isExpired } from "@/lib/expiry";
import { getFileBuffer } from "@/lib/storage";
import { renderMarkdown } from "@/lib/markdown";
import { eq, and } from "drizzle-orm";
import { extname } from "path";
import { PageShell } from "@/components/page-shell";
import { FilePreview } from "@/components/file-preview";
import { CodePreview } from "@/components/preview/code-preview";
import { ImagePreview } from "@/components/preview/image-preview";
import { VideoPreview } from "@/components/preview/video-preview";
import { AudioPreview } from "@/components/preview/audio-preview";
import { CsvPreview } from "@/components/preview/csv-preview";
import { MarkdownPreview } from "@/components/preview/markdown-preview";
import { DownloadPreview } from "@/components/preview/download-preview";

// Extensions that should be rendered as code
const CODE_EXTENSIONS = new Set([
  ".js", ".ts", ".jsx", ".tsx", ".py", ".rb", ".rs", ".go", ".java",
  ".c", ".cpp", ".h", ".sh", ".sql", ".json", ".yaml", ".yml", ".toml",
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
  const filePath = pathSegments.join("/");

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

  const previewType = detectPreviewType(filePath, file.mimeType);

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
        mimeType={file.mimeType}
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
            mimeType={file.mimeType}
            size={file.size}
          />
        )}
      </FilePreview>
    </PageShell>
  );
}
