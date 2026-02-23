import { Card } from "@/components/ui/card";
import { basename } from "node:path";

interface ImagePreviewProps {
  bucketId: string;
  filePath: string;
}

export function ImagePreview({ bucketId, filePath }: ImagePreviewProps) {
  const fileName = basename(filePath);

  return (
    <Card className="flex justify-center rounded-lg border-border bg-surface p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/raw/${bucketId}/${filePath}`}
        alt={fileName}
        className="max-w-full rounded"
      />
    </Card>
  );
}
