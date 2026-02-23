
interface VideoPreviewProps {
  bucketId: string;
  filePath: string;
}

export function VideoPreview({ bucketId, filePath }: VideoPreviewProps) {
  return (
    <div className="flex justify-center rounded-lg border border-border bg-surface p-4">
      <video
        controls
        preload="metadata"
        src={`/raw/${bucketId}/${filePath}`}
        className="max-w-full rounded"
      />
    </div>
  );
}
