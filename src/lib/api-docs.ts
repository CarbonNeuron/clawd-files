export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";
export type AuthLevel = "admin" | "api_key" | "owner" | "public";

export interface Endpoint {
  method: HttpMethod;
  path: string;
  description: string;
  auth: AuthLevel;
  requestBody?: Record<string, unknown>;
  responseExample: Record<string, unknown>;
  curl: string;
}

export interface EndpointGroup {
  name: string;
  slug: string;
  description: string;
  endpoints: Endpoint[];
}

const BASE = "http://localhost:3000";

export const API_DOCS: EndpointGroup[] = [
  {
    name: "Keys",
    slug: "keys",
    description: "Manage API keys. All key endpoints require admin authentication.",
    endpoints: [
      {
        method: "POST",
        path: "/api/keys",
        description: "Create a new API key. Returns the full key once — store it securely.",
        auth: "admin",
        requestBody: { name: "claude-agent" },
        responseExample: {
          ok: true,
          data: {
            key: "cf_a1b2c3d4e5f6...",
            prefix: "cf_a1b2c",
            name: "claude-agent",
            created_at: 1700000000,
          },
        },
        curl: `curl -X POST ${BASE}/api/keys \\\n  -H "Authorization: Bearer $ADMIN_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name": "claude-agent"}'`,
      },
      {
        method: "GET",
        path: "/api/keys",
        description: "List all API keys with usage stats (prefix only, not full keys).",
        auth: "admin",
        responseExample: {
          ok: true,
          data: {
            keys: [
              {
                prefix: "cf_a1b2c",
                name: "claude-agent",
                created_at: 1700000000,
                last_used_at: 1700001000,
                bucket_count: 3,
              },
            ],
          },
        },
        curl: `curl ${BASE}/api/keys \\\n  -H "Authorization: Bearer $ADMIN_KEY"`,
      },
      {
        method: "DELETE",
        path: "/api/keys/:prefix",
        description: "Revoke an API key by its prefix. Buckets created by this key remain.",
        auth: "admin",
        responseExample: {
          ok: true,
          data: { deleted: true, prefix: "cf_a1b2c", name: "claude-agent" },
        },
        curl: `curl -X DELETE ${BASE}/api/keys/cf_a1b2c \\\n  -H "Authorization: Bearer $ADMIN_KEY"`,
      },
    ],
  },
  {
    name: "Buckets",
    slug: "buckets",
    description:
      "Create and manage file buckets. Buckets are the primary organizational unit — each has a unique ID, optional expiry, and can hold multiple files.",
    endpoints: [
      {
        method: "POST",
        path: "/api/buckets",
        description:
          'Create a new bucket. Requires an API key (not the admin key). The "owner" field is auto-populated from the API key\'s name — do not send it.\n\nRequest body fields:\n- **name** (string, required): Bucket display name.\n- **description** (string, optional): Bucket description.\n- **for** (string, optional): Purpose label (e.g. "code-review").\n- **expires_in** (string, optional): Expiry preset or seconds. Presets: 1h, 6h, 12h, 1d, 3d, 1w, 2w, 1m, never. Defaults to **7 days** (1w) if omitted or invalid.',
        auth: "api_key",
        requestBody: {
          name: "my-project",
          description: "Project source files",
          for: "code-review",
          expires_in: "1w",
        },
        responseExample: {
          ok: true,
          data: {
            id: "abc123defg",
            name: "my-project",
            owner: "claude-agent",
            description: "Project source files",
            for: "code-review",
            created_at: 1700000000,
            expires_at: 1700604800,
            url: `${BASE}/abc123defg`,
            api_url: `${BASE}/api/buckets/abc123defg`,
          },
        },
        curl: `curl -X POST ${BASE}/api/buckets \\\n  -H "Authorization: Bearer $API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name": "my-project", "description": "Project source files", "for": "code-review", "expires_in": "1w"}'`,
      },
      {
        method: "GET",
        path: "/api/buckets",
        description:
          "List buckets. Admin sees all; API key sees only its own. Expired buckets are excluded.",
        auth: "api_key",
        responseExample: {
          ok: true,
          data: {
            buckets: [
              {
                id: "abc123defg",
                name: "my-project",
                owner: "claude-agent",
                description: "Project source files",
                for: "code-review",
                created_at: 1700000000,
                expires_at: 1700604800,
                url: `${BASE}/abc123defg`,
                api_url: `${BASE}/api/buckets/abc123defg`,
              },
            ],
          },
        },
        curl: `curl ${BASE}/api/buckets \\\n  -H "Authorization: Bearer $API_KEY"`,
      },
      {
        method: "GET",
        path: "/api/buckets/:id",
        description: "Get bucket details including full file listing. Public — no auth required. Each file includes a short_url for compact sharing.",
        auth: "public",
        responseExample: {
          ok: true,
          data: {
            id: "abc123defg",
            name: "my-project",
            owner: "claude-agent",
            description: "Project source files",
            for: "code-review",
            created_at: 1700000000,
            expires_at: 1700604800,
            url: `${BASE}/abc123defg`,
            api_url: `${BASE}/api/buckets/abc123defg`,
            files: [
              {
                path: "src/main.rs",
                size: 1234,
                mime_type: "text/x-rust",
                created_at: 1700000000,
                url: `${BASE}/abc123defg/src/main.rs`,
                raw_url: `${BASE}/raw/abc123defg/src/main.rs`,
                short_url: `${BASE}/s/xK9mQ2`,
                api_url: `${BASE}/api/buckets/abc123defg`,
              },
            ],
          },
        },
        curl: `curl ${BASE}/api/buckets/abc123defg`,
      },
      {
        method: "PATCH",
        path: "/api/buckets/:id",
        description: "Update bucket metadata. Only the owner or admin can modify. All fields are optional but at least one must be provided.",
        auth: "owner",
        requestBody: {
          name: "renamed-project",
          description: "Updated description",
          expires_in: "1m",
        },
        responseExample: {
          ok: true,
          data: {
            id: "abc123defg",
            name: "renamed-project",
            owner: "claude-agent",
            description: "Updated description",
            for: "code-review",
            created_at: 1700000000,
            expires_at: 1702592000,
            url: `${BASE}/abc123defg`,
            api_url: `${BASE}/api/buckets/abc123defg`,
          },
        },
        curl: `curl -X PATCH ${BASE}/api/buckets/abc123defg \\\n  -H "Authorization: Bearer $API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name": "renamed-project"}'`,
      },
      {
        method: "DELETE",
        path: "/api/buckets/:id",
        description: "Delete a bucket and all its files from disk. Owner or admin only.",
        auth: "owner",
        responseExample: {
          ok: true,
          data: { deleted: true, id: "abc123defg" },
        },
        curl: `curl -X DELETE ${BASE}/api/buckets/abc123defg \\\n  -H "Authorization: Bearer $API_KEY"`,
      },
    ],
  },
  {
    name: "Files",
    slug: "files",
    description: "Upload and delete files within buckets.",
    endpoints: [
      {
        method: "POST",
        path: "/api/buckets/:id/upload",
        description:
          'Upload files via multipart/form-data. Accepts multiple files in a single request. The form field name determines the file path: use a generic name (file, files, upload, uploads, blob) to keep the original filename, or set the field name to a custom path (e.g. "src/main.rs") to override it. Re-uploading the same path overwrites the existing file. Each uploaded file gets a short_url — a compact, shareable link (e.g. /s/xK9mQ2) that redirects to the raw file.',
        auth: "owner",
        responseExample: {
          ok: true,
          data: {
            uploaded: [
              {
                path: "screenshot.png",
                size: 48210,
                mime_type: "image/png",
                url: `${BASE}/abc123defg/screenshot.png`,
                raw_url: `${BASE}/raw/abc123defg/screenshot.png`,
                short_url: `${BASE}/s/xK9mQ2`,
                api_url: `${BASE}/api/buckets/abc123defg`,
              },
              {
                path: "README.md",
                size: 256,
                mime_type: "text/markdown",
                url: `${BASE}/abc123defg/README.md`,
                raw_url: `${BASE}/raw/abc123defg/README.md`,
                short_url: `${BASE}/s/pL3nR7`,
                api_url: `${BASE}/api/buckets/abc123defg`,
              },
            ],
          },
        },
        curl: `# Upload multiple files (use -F for each file):\ncurl -X POST ${BASE}/api/buckets/abc123defg/upload \\\n  -H "Authorization: Bearer $API_KEY" \\\n  -F "files=@screenshot.png" \\\n  -F "files=@README.md"\n\n# Upload with custom path (field name = desired path):\ncurl -X POST ${BASE}/api/buckets/abc123defg/upload \\\n  -H "Authorization: Bearer $API_KEY" \\\n  -F "src/main.rs=@main.rs"`,
      },
      {
        method: "DELETE",
        path: "/api/buckets/:id/files",
        description: "Delete a specific file from a bucket by path. Send the path as JSON in the request body.",
        auth: "owner",
        requestBody: { path: "src/main.rs" },
        responseExample: {
          ok: true,
          data: { deleted: true, path: "src/main.rs" },
        },
        curl: `curl -X DELETE ${BASE}/api/buckets/abc123defg/files \\\n  -H "Authorization: Bearer $API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"path": "src/main.rs"}'`,
      },
    ],
  },
  {
    name: "Downloads",
    slug: "downloads",
    description: "Download raw files and ZIP archives. All download endpoints are public.",
    endpoints: [
      {
        method: "GET",
        path: "/raw/:bucket/:path",
        description:
          "Download a raw file. Returns the file with its original MIME type. Supports HTTP Range requests for partial content.",
        auth: "public",
        responseExample: { "(raw file content)": "" },
        curl: `curl ${BASE}/raw/abc123defg/src/main.rs`,
      },
      {
        method: "GET",
        path: "/api/buckets/:id/zip",
        description: "Download all files in a bucket as a ZIP archive.",
        auth: "public",
        responseExample: { "(ZIP archive)": "" },
        curl: `curl -o bucket.zip ${BASE}/api/buckets/abc123defg/zip`,
      },
    ],
  },
  {
    name: "Admin",
    slug: "admin",
    description: "Administrative endpoints for managing the instance.",
    endpoints: [
      {
        method: "GET",
        path: "/api/admin/dashboard-link",
        description:
          "Generate a time-limited URL for the admin dashboard. Link expires in 24 hours.",
        auth: "admin",
        responseExample: {
          ok: true,
          data: {
            url: `${BASE}/admin?token=abc123...`,
            expires_in: "24h",
          },
        },
        curl: `curl ${BASE}/api/admin/dashboard-link \\\n  -H "Authorization: Bearer $ADMIN_KEY"`,
      },
    ],
  },
  {
    name: "LLM-Friendly",
    slug: "llm-friendly",
    description:
      "Endpoints optimized for LLM consumption. Plain text summaries and machine-readable docs.",
    endpoints: [
      {
        method: "GET",
        path: "/api/buckets/:id/summary",
        description:
          "Plain-text summary of a bucket: name, owner, file listing with sizes and MIME types, and full README content if present. Ideal for pasting into an LLM context window.",
        auth: "public",
        responseExample: {
          "(plain text)": "# my-project\nOwner: claude-agent\nFor: code-review\nDescription: Project source files\nFiles: 2\n\n## File Listing\n- src/main.rs (1KB, text/x-rust)\n- README.md (256B, text/markdown)\n\n## README\n# My Project\nThis is the readme content...",
        },
        curl: `curl ${BASE}/api/buckets/abc123defg/summary`,
      },
      {
        method: "GET",
        path: "/llms.txt",
        description:
          "Machine-readable overview of the Clawd Files instance, endpoints, and capabilities.",
        auth: "public",
        responseExample: { "(plain text)": "# Clawd Files\n> A file-sharing platform..." },
        curl: `curl ${BASE}/llms.txt`,
      },
      {
        method: "GET",
        path: "/docs/api.md",
        description: "Full API documentation in Markdown format, suitable for LLM context windows.",
        auth: "public",
        responseExample: { "(markdown)": "# Clawd Files API\n## Keys\n..." },
        curl: `curl ${BASE}/docs/api.md`,
      },
    ],
  },
];

/**
 * Generate the full API docs as a markdown string.
 * Used by both the /docs page renderer and the /docs/api.md route.
 */
export function generateMarkdown(): string {
  const lines: string[] = [];

  lines.push("# Clawd Files API");
  lines.push("");
  lines.push("REST API for managing file buckets, uploading files, and generating share links.");
  lines.push("");
  lines.push("## Authentication");
  lines.push("");
  lines.push("Pass your API key via the `Authorization` header:");
  lines.push("");
  lines.push("```");
  lines.push("Authorization: Bearer cf_your_api_key");
  lines.push("```");
  lines.push("");
  lines.push("Auth levels:");
  lines.push("- **admin** — Requires the admin key (set via `ADMIN_KEY` env var)");
  lines.push("- **api_key** — Requires any valid API key");
  lines.push("- **owner** — Requires the API key that created the resource");
  lines.push("- **public** — No authentication needed");
  lines.push("");
  lines.push("## Error Format");
  lines.push("");
  lines.push("All errors return JSON with this shape:");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify({ error: "Short error message", hint: "Actionable suggestion for fixing the issue." }, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("Common error status codes: 400 (bad request), 401 (missing/invalid auth), 403 (forbidden), 404 (not found).");
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const group of API_DOCS) {
    lines.push(`## ${group.name}`);
    lines.push("");
    lines.push(group.description);
    lines.push("");

    for (const ep of group.endpoints) {
      lines.push(`### ${ep.method} \`${ep.path}\``);
      lines.push("");
      lines.push(ep.description);
      lines.push("");
      lines.push(`**Auth:** ${ep.auth}`);
      lines.push("");

      if (ep.requestBody) {
        lines.push("**Request body:**");
        lines.push("");
        lines.push("```json");
        lines.push(JSON.stringify(ep.requestBody, null, 2));
        lines.push("```");
        lines.push("");
      }

      lines.push("**Response:**");
      lines.push("");
      lines.push("```json");
      lines.push(JSON.stringify(ep.responseExample, null, 2));
      lines.push("```");
      lines.push("");

      lines.push("**Example:**");
      lines.push("");
      lines.push("```bash");
      lines.push(ep.curl);
      lines.push("```");
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  return lines.join("\n");
}
