import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { secondsRemaining } from "@/lib/expiry";
import { Download, ExternalLink, ChevronRight } from "lucide-react";

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
    <nav className="flex items-center gap-1 text-sm text-text-muted overflow-x-auto">
      <Link
        href={`/${bucketId}`}
        className="text-accent hover:text-accent/80 shrink-0"
      >
        {bucketName}
      </Link>
      {folderSegments.map((segment, i) => {
        const path = folderSegments.slice(0, i + 1).join("/") + "/";
        return (
          <span key={path} className="flex items-center gap-1">
            <ChevronRight className="size-3 text-text-muted shrink-0" />
            <Link
              href={`/${bucketId}?path=${encodeURIComponent(path)}`}
              className="text-accent hover:text-accent/80"
            >
              {segment}
            </Link>
          </span>
        );
      })}
      <span className="flex items-center gap-1">
        <ChevronRight className="size-3 text-text-muted shrink-0" />
        <span className="text-text">{fileName}</span>
      </span>
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
  const rawUrl = `/raw/${bucketId}/${filePath}`;
  const curlCommand = `curl -O ${baseUrl}/raw/${bucketId}/${filePath}`;

  return (
    <div className="space-y-6 py-8">
      {/* Top bar */}
      <div className="space-y-4">
        <FileBreadcrumbs
          bucketId={bucketId}
          bucketName={bucketName}
          filePath={filePath}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-orange-900/50 text-accent-warm border-orange-800">
            {mimeType}
          </Badge>
          <Badge variant="secondary">{formatSize(size)}</Badge>
          {expiresAt === null ? (
            <Badge className="bg-emerald-900/50 text-emerald-400 border-emerald-800">
              Permanent
            </Badge>
          ) : (
            <Badge className="bg-orange-900/50 text-accent-warm border-orange-800">
              {remaining !== null
                ? formatTimeRemaining(remaining)
                : "Expired"}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <a href={rawUrl} download>
              <Download className="size-4" />
              Download
            </a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={rawUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              Raw
            </a>
          </Button>
        </div>

        {/* Curl command */}
        <div className="rounded-lg border border-border bg-surface px-4 py-3">
          <code className="text-xs font-code text-text-muted break-all select-all">
            {curlCommand}
          </code>
        </div>
      </div>

      {/* Preview content */}
      <div>{children}</div>
    </div>
  );
}
