import Image from "next/image";
import { basename } from "node:path";
import { encodePath } from "@/lib/urls";

interface ImagePreviewProps {
  bucketId: string;
  filePath: string;
}

export function ImagePreview({ bucketId, filePath }: ImagePreviewProps) {
  const fileName = basename(filePath);

  return (
    <div className="flex justify-center rounded-lg border border-border bg-surface p-4">
      <Image
        src={`/raw/${bucketId}/${encodePath(filePath)}`}
        alt={fileName}
        width={0}
        height={0}
        sizes="(max-width: 1152px) 100vw, 1152px"
        className="h-auto w-auto max-w-full max-h-[80vh] rounded object-contain"
        unoptimized
      />
    </div>
  );
}
