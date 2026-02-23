function getBaseUrl(): string {
  return process.env.BASE_URL || "http://localhost:3000";
}

/**
 * Encode each segment of a file path for use in URLs.
 * Preserves `/` as path separators but encodes everything else
 * (#, ?, %, spaces, unicode, etc.).
 */
export function encodePath(filePath: string): string {
  return filePath.split("/").map(encodeURIComponent).join("/");
}

export function bucketUrl(bucketId: string) {
  const base = getBaseUrl();
  return {
    url: `${base}/${bucketId}`,
    api_url: `${base}/api/buckets/${bucketId}`,
  };
}

export function fileUrl(bucketId: string, filePath: string) {
  const base = getBaseUrl();
  const encoded = encodePath(filePath);
  return {
    url: `${base}/${bucketId}/${encoded}`,
    raw_url: `${base}/raw/${bucketId}/${encoded}`,
    api_url: `${base}/api/buckets/${bucketId}`,
  };
}
