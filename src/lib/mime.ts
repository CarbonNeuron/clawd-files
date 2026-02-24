/**
 * MIME type overrides for extensions that common libraries misdetect.
 * Notably, .ts is detected as video/mp2t (MPEG-2 Transport Stream)
 * instead of text/typescript.
 */
export const MIME_OVERRIDES: Record<string, string> = {
  ".ts": "text/typescript",
  ".tsx": "text/typescript-jsx",
  ".mts": "text/typescript",
  ".cts": "text/typescript",
};

/**
 * Correct known MIME type misdetections based on file extension.
 * Falls back to the provided mimeType if no override matches.
 */
export function correctMimeType(filePath: string, mimeType: string): string {
  const dot = filePath.lastIndexOf(".");
  if (dot === -1) return mimeType;
  const ext = filePath.slice(dot).toLowerCase();
  return MIME_OVERRIDES[ext] ?? mimeType;
}
