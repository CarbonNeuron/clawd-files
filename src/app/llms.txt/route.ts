export async function GET() {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";

  const content = `# Clawd Files

> A file-sharing platform with bucket-based organization, API key authentication, and LLM-friendly endpoints.

## Base URL

${baseUrl}

## Authentication

Most write endpoints require an API key passed via the Authorization header:

    Authorization: Bearer <api_key>

Admin endpoints require the admin API key. Regular API keys can manage their own buckets and files. Read-only bucket and file access is public (no auth required).

## API Endpoints

### API Keys (Admin only)

- POST ${baseUrl}/api/keys — Create a new API key. Body: { "name": "string" }
- GET ${baseUrl}/api/keys — List all API keys with usage stats.
- DELETE ${baseUrl}/api/keys/{prefix} — Revoke an API key by prefix.

### Admin

- GET ${baseUrl}/api/admin/dashboard-link — Generate a time-limited admin dashboard URL.

### Buckets

- POST ${baseUrl}/api/buckets — Create a bucket. Body: { "name", "owner", "description?", "for?", "expires_in?" }
- GET ${baseUrl}/api/buckets/{id} — Get bucket details and file listing (public).
- PATCH ${baseUrl}/api/buckets/{id} — Update bucket metadata. Body: { "name?", "description?", "expires_in?" }
- DELETE ${baseUrl}/api/buckets/{id} — Delete a bucket and all its files.

### Files

- POST ${baseUrl}/api/buckets/{id}/upload — Upload files (multipart/form-data). Field: "files".
- GET ${baseUrl}/api/buckets/{id}/files — List files in a bucket (public).
- DELETE ${baseUrl}/api/buckets/{id}/files?path={path} — Delete a specific file.

### Downloads

- GET ${baseUrl}/api/buckets/{id}/zip — Download all bucket files as a ZIP archive (public).
- GET ${baseUrl}/raw/{id}/{path} — Download a raw file by path (public).

### LLM-Friendly

- GET ${baseUrl}/api/buckets/{id}/summary — Plain text summary of a bucket, its files, and README content.
- GET ${baseUrl}/llms.txt — This file.

## File Access URLs

Files can be accessed via short URLs:

- ${baseUrl}/{bucket_id} — Bucket page
- ${baseUrl}/{bucket_id}/{file_path} — File page (HTML for browsers, raw file for non-browser clients)
- ${baseUrl}/raw/{bucket_id}/{file_path} — Always returns the raw file

## Expiry

Buckets can have optional expiry times. Expired buckets are automatically cleaned up. Expiry presets: 1h, 6h, 12h, 1d, 3d, 1w, 2w, 1m, never.
`;

  return new Response(content, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
