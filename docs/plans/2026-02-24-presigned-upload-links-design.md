# Pre-Signed Upload Links

## Problem

LLMs using Clawd-Files can create buckets and upload files via API key, but there's no way for an LLM to let a *human user* upload files without sharing the API key. When a user tells an LLM "send me your files" or "I'll upload screenshots for you to review," the LLM needs a secure, time-limited URL it can share in conversation.

## Solution

Stateless HMAC-signed upload tokens that grant temporary upload access to a specific bucket. The LLM generates a pre-signed URL and shares it with the user. The user opens the URL in a browser, uploads files via drag-and-drop, and the LLM can then access them through the existing bucket/summary endpoints.

## Token Design

**Format**: `base64url(bucketId:expiresAt.hmac_signature)`

- Payload: `bucketId:expiresAt` (bucket ID + Unix timestamp)
- Signature: HMAC-SHA256 of the payload using `ADMIN_API_KEY` as secret
- Default expiry: 1 hour
- Stateless: no DB storage, no revocation (tokens expire naturally)

**New functions in `src/lib/auth.ts`**:
- `generateUploadToken(bucketId: string, validHours?: number): string`
- `verifyUploadToken(token: string): { bucketId: string } | null`

This mirrors the existing `generateDashboardToken` / `verifyDashboardToken` pattern.

## API Changes

### New Endpoint: Generate Upload Link

```
POST /api/buckets/:id/upload-link
Authorization: Bearer <api_key>
Content-Type: application/json

{ "expires_in": "1h" }   // optional, defaults to "1h"
```

Response (200):
```json
{
  "upload_url": "https://files.example.com/upload/aBcDeFgHiJ?token=...",
  "expires_in": "1h",
  "bucket": {
    "id": "aBcDeFgHiJ",
    "name": "User Screenshots"
  }
}
```

**Auth**: Bucket owner or admin only.

### Extended: Bucket Creation

```
POST /api/buckets
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "name": "User Screenshots",
  "generate_upload_link": true,
  "upload_link_expires_in": "1h"
}
```

When `generate_upload_link` is true, the response includes an additional `upload_url` field alongside the existing bucket fields.

### Extended: Upload Endpoint

```
POST /api/buckets/:id/upload?token=<signed_token>
Content-Type: multipart/form-data
```

The existing upload route at `/api/buckets/:id/upload` is extended to accept a `?token=` query parameter as an alternative to `Authorization: Bearer` header authentication. If a valid token is present and its `bucketId` matches the route's `:id`, the upload is authorized without an API key.

Token auth and API key auth are mutually exclusive per request. If both are provided, API key auth takes precedence.

## Browser Upload Page

**Route**: `/upload/[bucket]/page.tsx`

**URL**: `https://files.example.com/upload/aBcDeFgHiJ?token=...`

**Behavior**:
1. Server-side: validate token. If invalid/expired, render error message.
2. If valid: render upload UI showing bucket name and a drag-and-drop zone with file picker.
3. Client-side JS uploads files via `POST /api/buckets/:id/upload?token=...` (multipart/form-data).
4. On success: display list of uploaded files with links to view them.

**Implementation notes**:
- Client component (requires JS for drag-and-drop and upload progress).
- Matches existing Clawd-Files styling (Tailwind v4 + shadcn/ui, dark theme).
- Token stays on same origin (never sent to third parties).

## Documentation Updates

Update `src/lib/api-docs.ts` to include:
- The new `POST /api/buckets/:id/upload-link` endpoint
- The `?token=` query param on the upload endpoint
- The `generate_upload_link` and `upload_link_expires_in` fields on bucket creation

These changes propagate to `/llms.txt` and `/docs/api.md` automatically.

## Expiry Format

Upload link expiry uses the same format as bucket expiry: `"1h"`, `"6h"`, `"12h"`, `"1d"`, `"3d"`, `"1w"`. Default is `"1h"`. The `parseExpiry` function in `expiry.ts` may need a minor extension to return hours instead of absolute timestamps, or the upload-link endpoint computes the absolute expiry itself.

## Out of Scope

- Token revocation (stateless by design)
- Upload size/count limits (none currently exist)
- MCP integration (separate feature)
- New DB tables or schema changes
