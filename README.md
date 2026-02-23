# Clawd Files

Self-hosted file hosting platform designed for LLM agents. Organize files into **buckets**, upload via REST API, preview in the browser. Designed by Clawd.

## Features

- **Buckets** — Organize files into named buckets with automatic expiry (1h to never)
- **API-First** — REST API with clean JSON responses, built for LLM agents
- **File Previews** — Syntax highlighting (Shiki), markdown rendering, CSV tables, media players
- **Content Negotiation** — Same URL serves raw files to `curl` and HTML previews to browsers
- **Admin Dashboard** — Stats, key management, bucket management via signed token URL
- **OG Tags** — Dynamic OpenGraph cards for link previews in Discord, Telegram, etc.
- **Docker-Ready** — Single container, SQLite + local filesystem, no external dependencies

## Quick Start with Docker Compose

Create a `docker-compose.yml`:

```yaml
services:
  clawd-files:
    image: ghcr.io/carbonneuron/clawd-files:latest
    ports:
      - "3000:3000"
    environment:
      - ADMIN_API_KEY=change-me-to-a-strong-secret
      - BASE_URL=http://localhost:3000
      - DATA_DIR=/app/data
    volumes:
      - clawd-data:/app/data

volumes:
  clawd-data:
```

```bash
docker compose up -d
```

Then create your first API key:

```bash
curl -X POST http://localhost:3000/api/keys \
  -H "Authorization: Bearer change-me-to-a-strong-secret" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Agent"}'
```

## Quick Start with Docker

```bash
docker run -d \
  -p 3000:3000 \
  -e ADMIN_API_KEY=change-me-to-a-strong-secret \
  -e BASE_URL=http://localhost:3000 \
  -v clawd-data:/app/data \
  ghcr.io/carbonneuron/clawd-files:latest
```

## Build from Source

```bash
git clone https://github.com/CarbonNeuron/clawd-files.git
cd clawd-files
npm ci
cp .env.local.example .env.local  # edit with your settings
npm run dev
```

Or build the Docker image locally:

```bash
docker build -t clawd-files .
docker run -p 3000:3000 -e ADMIN_API_KEY=secret -e BASE_URL=http://localhost:3000 -v clawd-data:/app/data clawd-files
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ADMIN_API_KEY` | Yes | — | Secret key for admin operations |
| `BASE_URL` | Yes | — | Public URL (used in API responses and OG tags) |
| `DATA_DIR` | No | `./data` | SQLite database and file storage directory |
| `PORT` | No | `3000` | Server port |

## API Usage

### Create an API key (admin)

```bash
curl -X POST http://localhost:3000/api/keys \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Agent"}'
```

### Create a bucket

```bash
curl -X POST http://localhost:3000/api/buckets \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Bucket", "expires_in": "1w"}'
```

### Upload files

```bash
curl -X POST http://localhost:3000/api/buckets/$BUCKET_ID/upload \
  -H "Authorization: Bearer $API_KEY" \
  -F "README.md=@README.md" \
  -F "src/main.py=@main.py"
```

Field names become file paths — uploading entire directory trees in one request is supported.

### Access files

```bash
# Raw download (curl, wget, programmatic)
curl http://localhost:3000/$BUCKET_ID/README.md

# Browser → HTML preview with syntax highlighting
# Same URL, content negotiation handles it

# Explicit raw download regardless of Accept header
curl http://localhost:3000/raw/$BUCKET_ID/README.md

# Download entire bucket as ZIP
curl -o bucket.zip http://localhost:3000/api/buckets/$BUCKET_ID/zip
```

### Full API reference

- Interactive docs: `http://localhost:3000/docs`
- Raw markdown: `http://localhost:3000/docs/api.md`
- LLM-friendly overview: `http://localhost:3000/llms.txt`

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/keys` | Admin | Create API key |
| `GET` | `/api/keys` | Admin | List API keys |
| `DELETE` | `/api/keys/:prefix` | Admin | Revoke API key |
| `POST` | `/api/buckets` | API key | Create bucket |
| `GET` | `/api/buckets` | API key | List own buckets |
| `GET` | `/api/buckets/:id` | Public | Bucket info + files |
| `PATCH` | `/api/buckets/:id` | Owner | Update bucket |
| `DELETE` | `/api/buckets/:id` | Owner | Delete bucket |
| `POST` | `/api/buckets/:id/upload` | Owner | Upload files |
| `DELETE` | `/api/buckets/:id/files` | Owner | Delete file |
| `GET` | `/api/buckets/:id/zip` | Public | Download as ZIP |
| `GET` | `/api/buckets/:id/summary` | Public | Plain-text summary |
| `GET` | `/api/admin/dashboard-link` | Admin | Generate dashboard URL |
| `GET` | `/raw/:bucket/:path` | Public | Raw file download |
| `GET` | `/llms.txt` | Public | Platform overview |

## Expiry Presets

`1h`, `6h`, `12h`, `1d`, `3d`, `1w` (default), `2w`, `1m`, `never`

Expired buckets and their files are automatically cleaned up every 15 minutes.

## Tech Stack

- **Next.js 16** (App Router, Server Components)
- **TypeScript** (strict)
- **Tailwind CSS v4** + shadcn/ui
- **SQLite** (Drizzle ORM + better-sqlite3)
- **Shiki** (server-side syntax highlighting)
- **Docker** (multi-stage build, node:22-alpine)

## License

MIT
