import Link from "next/link";
import { secondsRemaining } from "@/lib/expiry";
import { Download, ExternalLink } from "lucide-react";
import { encodePath } from "@/lib/urls";

interface FilePreviewProps {
  bucketId: string;
  bucketName: string;
  filePath: string;
  mimeType: string;
  size: number;
  expiresAt: number | null;
  children: React.ReactNode;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) return `${seconds}s remaining`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m remaining`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h remaining`;
  const days = Math.floor(seconds / 86400);
  return `${days}d remaining`;
}

function getExtBadge(filePath: string): string | null {
  const dot = filePath.lastIndexOf(".");
  if (dot === -1) return null;
  return filePath.slice(dot + 1).toUpperCase();
}

function FileBreadcrumbs({
  bucketId,
  bucketName,
  filePath,
}: {
  bucketId: string;
  bucketName: string;
  filePath: string;
}) {
  const segments = filePath.split("/");
  const fileName = segments[segments.length - 1];
  const folderSegments = segments.slice(0, -1);

  return (
    <nav aria-label="Breadcrumb" className="overflow-x-auto font-code">
      <ol className="flex items-center gap-1.5 text-sm">
        <li>
          <Link href={`/${bucketId}`} className="text-text-muted hover:text-accent">
            {bucketName}
          </Link>
        </li>
        {folderSegments.map((segment, i) => {
          const path = folderSegments.slice(0, i + 1).join("/") + "/";
          return (
            <li key={path} className="flex items-center gap-1.5">
              <span className="text-text-muted/50">/</span>
              <Link href={`/${bucketId}?path=${encodeURIComponent(path)}`} className="text-text-muted hover:text-accent">
                {segment}
              </Link>
            </li>
          );
        })}
        <li className="flex items-center gap-1.5">
          <span className="text-text-muted/50">/</span>
          <span className="text-text" aria-current="page">{fileName}</span>
        </li>
      </ol>
    </nav>
  );
}

export function FilePreview({
  bucketId,
  bucketName,
  filePath,
  mimeType,
  size,
  expiresAt,
  children,
}: FilePreviewProps) {
  const remaining = secondsRemaining(expiresAt);
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const rawUrl = `/raw/${bucketId}/${encodePath(filePath)}`;
  const curlCommand = `curl -O ${baseUrl}/raw/${bucketId}/${encodePath(filePath)}`;
  const fileName = filePath.split("/").pop() || filePath;
  const ext = getExtBadge(filePath);

  return (
    <div className="space-y-6 py-8">
      {/* Breadcrumbs */}
      <FileBreadcrumbs
        bucketId={bucketId}
        bucketName={bucketName}
        filePath={filePath}
      />

      {/* ── Filename ── */}
      <div className="flex items-center gap-3">
        <h1
          className="font-heading text-2xl tracking-tight text-text sm:text-3xl"
          style={{ textShadow: "0 0 30px rgba(34, 211, 238, 0.06)" }}
        >
          {fileName}
        </h1>
        {ext && (
          <span className="inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-code font-medium bg-accent-warm/10 text-accent-warm border-accent-warm/20">
            {ext}
          </span>
        )}
      </div>

      {/* ── Metadata bar ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-surface/50 px-4 py-3">
        <span className="text-xs font-code text-text-muted">{mimeType}</span>
        <span className="text-border">·</span>
        <span className="text-xs font-code text-text-muted">{formatSize(size)}</span>
        <span className="text-border">·</span>
        {expiresAt === null ? (
          <span className="inline-flex items-center text-[10px] px-1.5 py-0 rounded border bg-emerald-900/40 text-emerald-400 border-emerald-800/50 font-code">
            Permanent
          </span>
        ) : (
          <span className="inline-flex items-center text-[10px] px-1.5 py-0 rounded border bg-accent-warm/10 text-accent-warm border-accent-warm/20 font-code">
            {remaining !== null
              ? formatTimeRemaining(remaining)
              : "Expired"}
          </span>
        )}

        {/* Actions pushed right */}
        <div className="ml-auto flex items-center gap-2">
          <a href={rawUrl} download className="btn btn-outline btn-xs glow-cyan-hover">
            <Download className="size-3" />
            Download
          </a>
          <a href={rawUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-xs">
            <ExternalLink className="size-3" />
            Raw
          </a>
        </div>
      </div>

      {/* Curl command */}
      <div className="rounded-lg border border-border bg-bg/50 px-4 py-2.5">
        <code className="text-xs font-code text-text-muted/80 break-all select-all">
          {curlCommand}
        </code>
      </div>

      {/* ── Preview content ── */}
      <div>{children}</div>
    </div>
  );
}
