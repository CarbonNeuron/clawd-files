import { basename } from "path";

interface ImagePreviewProps {
  bucketId: string;
  filePath: string;
}

export function ImagePreview({ bucketId, filePath }: ImagePreviewProps) {
  const fileName = basename(filePath);

  return (
    <div className="flex justify-center rounded-lg border border-border bg-surface p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/raw/${bucketId}/${filePath}`}
        alt={fileName}
        className="max-w-full rounded"
      />
    </div>
  );
}
