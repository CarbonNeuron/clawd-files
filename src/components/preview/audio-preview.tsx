interface AudioPreviewProps {
  bucketId: string;
  filePath: string;
}

export function AudioPreview({ bucketId, filePath }: AudioPreviewProps) {
  return (
    <div className="flex justify-center rounded-lg border border-border bg-surface p-8">
      <audio controls src={`/raw/${bucketId}/${filePath}`} className="w-full max-w-lg" />
    </div>
  );
}
