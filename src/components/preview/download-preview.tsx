import { Download, FileIcon } from "lucide-react";
import { basename } from "node:path";
import { encodePath } from "@/lib/urls";

interface DownloadPreviewProps {
  bucketId: string;
  filePath: string;
  mimeType: string;
  size: number;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function DownloadPreview({
  bucketId,
  filePath,
  mimeType,
  size,
}: DownloadPreviewProps) {
  const fileName = basename(filePath);

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface/50 py-16 px-8 text-center">
      <div className="relative mb-6">
        <FileIcon className="size-16 text-text-muted/40" />
        <div className="absolute inset-0 blur-xl bg-accent/5 rounded-full" />
      </div>
      <h2 className="font-heading text-xl text-text mb-2">{fileName}</h2>
      <p className="text-xs text-text-muted font-code mb-1">{mimeType}</p>
      <p className="text-xs text-text-muted font-code mb-8">{formatSize(size)}</p>
      <a href={`/raw/${bucketId}/${encodePath(filePath)}`} download className="btn btn-primary btn-lg glow-cyan-hover">
        <Download className="size-4" />
        Download File
      </a>
    </div>
  );
}
