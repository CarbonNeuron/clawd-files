import { Button } from "@/components/ui/button";
import { Download, FileIcon } from "lucide-react";
import { basename } from "node:path";

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
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface py-16 px-8 text-center">
      <FileIcon className="size-16 text-text-muted mb-4" />
      <h2 className="font-heading text-xl text-text mb-2">{fileName}</h2>
      <p className="text-sm text-text-muted mb-1">{mimeType}</p>
      <p className="text-sm text-text-muted mb-6">{formatSize(size)}</p>
      <Button asChild size="lg">
        <a href={`/raw/${bucketId}/${filePath}`} download>
          <Download className="size-4" />
          Download File
        </a>
      </Button>
    </div>
  );
}
