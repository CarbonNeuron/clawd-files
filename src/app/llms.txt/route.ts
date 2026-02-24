export const runtime = 'nodejs';

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

## Error Format

All errors return JSON with two fields:

    {"error": "Short error message", "hint": "Actionable suggestion for fixing the issue."}

Common status codes: 400 (bad request), 401 (missing/invalid auth), 403 (forbidden), 404 (not found).

Example error responses:

    401: {"error": "Missing authentication", "hint": "Include an Authorization: Bearer <key> header."}
    403: {"error": "Forbidden", "hint": "You can only upload to buckets you own."}
    404: {"error": "Bucket not found", "hint": "This bucket does not exist or has expired."}

## API Endpoints

### API Keys (Admin only)

#### POST ${baseUrl}/api/keys
Create a new API key.

    curl -X POST ${baseUrl}/api/keys \\
      -H "Authorization: Bearer $ADMIN_KEY" \\
      -H "Content-Type: application/json" \\
      -d '{"name": "claude-agent"}'

Response (201):

    {
      "key": "cf_a1b2c3d4e5f6...",
      "prefix": "cf_a1b2c",
      "name": "claude-agent",
      "created_at": 1700000000
    }

#### GET ${baseUrl}/api/keys
List all API keys with usage stats.

    curl ${baseUrl}/api/keys -H "Authorization: Bearer $ADMIN_KEY"

#### DELETE ${baseUrl}/api/keys/{prefix}
Revoke an API key by prefix. Buckets created by the key are preserved.

    curl -X DELETE ${baseUrl}/api/keys/cf_a1b2c -H "Authorization: Bearer $ADMIN_KEY"

---

### Buckets

#### POST ${baseUrl}/api/buckets
Create a bucket. Requires a non-admin API key.

Request body fields:
- name (string, REQUIRED): Bucket display name.
- description (string, optional): Bucket description.
- for (string, optional): Purpose label (e.g. "code-review").
- expires_in (string, optional): Expiry preset or seconds. Default: 7 days (1w) if omitted.
  Presets: 1h, 6h, 12h, 1d, 3d, 1w, 2w, 1m, never.

The "owner" field is auto-populated from the API key's name — do not send it.

    curl -X POST ${baseUrl}/api/buckets \\
      -H "Authorization: Bearer $API_KEY" \\
      -H "Content-Type: application/json" \\
      -d '{"name": "my-project", "description": "Project source files", "for": "code-review", "expires_in": "1w"}'

Response (201):

    {
      "id": "abc123defg",
      "name": "my-project",
      "owner": "claude-agent",
      "description": "Project source files",
      "for": "code-review",
      "created_at": 1700000000,
      "expires_at": 1700604800,
      "url": "${baseUrl}/abc123defg",
      "api_url": "${baseUrl}/api/buckets/abc123defg"
    }

#### GET ${baseUrl}/api/buckets
List your buckets. Admin sees all; API key sees only its own. Expired buckets excluded.

    curl ${baseUrl}/api/buckets -H "Authorization: Bearer $API_KEY"

#### GET ${baseUrl}/api/buckets/{id}
Get bucket details and full file listing. Public — no auth required.

    curl ${baseUrl}/api/buckets/abc123defg

Response (200):

    {
      "id": "abc123defg",
      "name": "my-project",
      "owner": "claude-agent",
      "description": "Project source files",
      "for": "code-review",
      "created_at": 1700000000,
      "expires_at": 1700604800,
      "url": "${baseUrl}/abc123defg",
      "api_url": "${baseUrl}/api/buckets/abc123defg",
      "files": [
        {
          "path": "src/main.rs",
          "size": 1234,
          "mime_type": "text/x-rust",
          "created_at": 1700000000,
          "url": "${baseUrl}/abc123defg/src/main.rs",
          "raw_url": "${baseUrl}/raw/abc123defg/src/main.rs",
          "short_url": "${baseUrl}/s/xK9mQ2",
          "api_url": "${baseUrl}/api/buckets/abc123defg"
        }
      ]
    }

#### PATCH ${baseUrl}/api/buckets/{id}
Update bucket metadata. Owner or admin only. All fields optional, at least one required.

    curl -X PATCH ${baseUrl}/api/buckets/abc123defg \\
      -H "Authorization: Bearer $API_KEY" \\
      -H "Content-Type: application/json" \\
      -d '{"name": "renamed-project", "expires_in": "1m"}'

#### DELETE ${baseUrl}/api/buckets/{id}
Delete a bucket and all its files. Owner or admin only.

    curl -X DELETE ${baseUrl}/api/buckets/abc123defg -H "Authorization: Bearer $API_KEY"

---

### Files

#### POST ${baseUrl}/api/buckets/{id}/upload
Upload files via multipart/form-data. Owner or admin only.

Accepts MULTIPLE files in a single request — use one -F flag per file.

Field naming:
- Generic names (file, files, upload, uploads, blob): keeps the original filename.
- Custom field name (e.g. "src/main.rs"): uses the field name as the file path.

Re-uploading the same path overwrites the existing file.

    # Upload multiple files at once:
    curl -X POST ${baseUrl}/api/buckets/abc123defg/upload \\
      -H "Authorization: Bearer $API_KEY" \\
      -F "files=@screenshot.png" \\
      -F "files=@README.md"

    # Upload with custom path (field name = desired path):
    curl -X POST ${baseUrl}/api/buckets/abc123defg/upload \\
      -H "Authorization: Bearer $API_KEY" \\
      -F "src/main.rs=@main.rs"

Response (201):

    {
      "uploaded": [
        {
          "path": "screenshot.png",
          "size": 48210,
          "mime_type": "image/png",
          "url": "${baseUrl}/abc123defg/screenshot.png",
          "raw_url": "${baseUrl}/raw/abc123defg/screenshot.png",
          "short_url": "${baseUrl}/s/xK9mQ2",
          "api_url": "${baseUrl}/api/buckets/abc123defg"
        },
        {
          "path": "README.md",
          "size": 256,
          "mime_type": "text/markdown",
          "url": "${baseUrl}/abc123defg/README.md",
          "raw_url": "${baseUrl}/raw/abc123defg/README.md",
          "short_url": "${baseUrl}/s/pL3nR7",
          "api_url": "${baseUrl}/api/buckets/abc123defg"
        }
      ]
    }

#### DELETE ${baseUrl}/api/buckets/{id}/files
Delete a specific file by path. Owner or admin only.

    curl -X DELETE ${baseUrl}/api/buckets/abc123defg/files \\
      -H "Authorization: Bearer $API_KEY" \\
      -H "Content-Type: application/json" \\
      -d '{"path": "src/main.rs"}'

Response (200):

    {"deleted": true, "path": "src/main.rs"}

---

### Downloads (Public)

#### GET ${baseUrl}/raw/{bucket_id}/{file_path}
Download a raw file with its original MIME type. Supports HTTP Range requests.

    curl ${baseUrl}/raw/abc123defg/src/main.rs
    curl -o photo.png ${baseUrl}/raw/abc123defg/photo.png

#### GET ${baseUrl}/api/buckets/{id}/zip
Download all files in a bucket as a ZIP archive.

    curl -o bucket.zip ${baseUrl}/api/buckets/abc123defg/zip

---

### Short URLs

Every uploaded file gets a short_url (e.g. ${baseUrl}/s/xK9mQ2). This is a compact, shareable link that redirects (307) to the raw file. Useful for sharing individual files without exposing the full bucket path. Short URLs are returned in the upload response and in GET /api/buckets/{id}.

    curl -L ${baseUrl}/s/xK9mQ2    # follows redirect to raw file

---

### LLM-Friendly

#### GET ${baseUrl}/api/buckets/{id}/summary
Plain-text summary of a bucket optimized for LLM context windows. Returns the bucket name, owner, file listing with sizes and MIME types, and full README.md content if present.

    curl ${baseUrl}/api/buckets/abc123defg/summary

Response (200, text/plain):

    # my-project
    Owner: claude-agent
    For: code-review
    Description: Project source files
    Files: 2

    ## File Listing
    - src/main.rs (1KB, text/x-rust)
    - README.md (256B, text/markdown)

    ## README
    (full README.md content appears here if present)

#### GET ${baseUrl}/llms.txt
This file — machine-readable overview of the API.

#### GET ${baseUrl}/docs/api.md
Full API documentation in Markdown format.

---

## Expiry

Buckets can have optional expiry times. When expires_in is omitted, buckets default to **7 days**. Expired buckets return 404 and are automatically cleaned up.

Presets: 1h, 6h, 12h, 1d, 3d, 1w, 2w, 1m, never.

You can also pass a raw number of seconds as expires_in (e.g. "3600" for 1 hour).

## File Access URLs

- ${baseUrl}/{bucket_id} — Bucket page (HTML)
- ${baseUrl}/{bucket_id}/{file_path} — File page (HTML for browsers, raw for non-browser clients)
- ${baseUrl}/raw/{bucket_id}/{file_path} — Always returns the raw file
- ${baseUrl}/s/{short_id} — Short URL redirect to raw file
`;

  return new Response(content, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
