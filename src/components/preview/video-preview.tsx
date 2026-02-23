import { Card } from "@/components/ui/card";

interface VideoPreviewProps {
  bucketId: string;
  filePath: string;
}

export function VideoPreview({ bucketId, filePath }: VideoPreviewProps) {
  return (
    <Card className="flex justify-center rounded-lg border-border bg-surface p-4">
      <video
        controls
        preload="metadata"
        src={`/raw/${bucketId}/${filePath}`}
        className="max-w-full rounded"
      />
    </Card>
  );
}
