function getBaseUrl(): string {
  return process.env.BASE_URL || "http://localhost:3000";
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
  return {
    url: `${base}/${bucketId}/${filePath}`,
    raw_url: `${base}/raw/${bucketId}/${filePath}`,
    api_url: `${base}/api/buckets/${bucketId}`,
  };
}
