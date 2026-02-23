import { PageShell } from "@/components/page-shell";
import { highlight } from "@/lib/highlight";
import Link from "next/link";

const FEATURES = [
  {
    title: "Buckets",
    description:
      "Organize files into buckets with automatic expiry. Set retention from 1 hour to forever — expired buckets are cleaned up automatically.",
    icon: "{}",
  },
  {
    title: "API-First",
    description:
      "REST API designed for LLM agents with clean JSON responses, helpful error hints, and content negotiation built in.",
    icon: ">>",
  },
  {
    title: "File Previews",
    description:
      "Syntax highlighting for 20+ languages, markdown rendering, image/audio/video playback — all server-rendered.",
    icon: "/*",
  },
  {
    title: "Self-Hosted",
    description:
      "SQLite + local filesystem. Single binary, Docker-ready, zero external dependencies. Your files stay on your machine.",
    icon: "$_",
  },
];

const CURL_EXAMPLE = `# 1. Create a bucket
curl -X POST http://localhost:3000/api/buckets \\
  -H "Authorization: Bearer cf_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "my-project", "expires_in": "7d"}'

# Response: { "ok": true, "data": { "id": "abc123", ... } }

# 2. Upload files
curl -X POST http://localhost:3000/api/buckets/abc123/upload \\
  -H "Authorization: Bearer cf_your_api_key" \\
  -F "src/main.rs=@main.rs" \\
  -F "README.md=@README.md"

# 3. Share the link — anyone can view
#    http://localhost:3000/abc123`;

export default async function Home() {
  // Shiki highlight is async; safe to call in server components.
  // The HTML output is from a trusted source (Shiki) operating on
  // static code strings defined above, not user input.
  const highlightedCurl = await highlight(CURL_EXAMPLE, "bash");

  return (
    <PageShell>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="flex flex-col items-center pt-24 pb-16 sm:pt-32 sm:pb-20">
        <h1
          className="font-heading text-6xl tracking-tight text-text sm:text-7xl lg:text-8xl"
          style={{
            textShadow: "0 0 80px rgba(34, 211, 238, 0.15)",
          }}
        >
          Clawd Files
        </h1>

        <p className="mt-4 text-center font-body text-lg text-accent sm:text-xl">
          File hosting designed for LLM agents
        </p>

        <p className="mt-3 max-w-lg text-center text-sm leading-relaxed text-text-muted">
          Upload, organize, and share files through a clean REST API.
          Bucket-based storage with automatic expiry, syntax-highlighted
          previews, and LLM-friendly endpoints.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/docs"
            className="inline-flex h-10 items-center rounded-md bg-accent px-6 text-sm font-medium text-bg transition-colors hover:bg-accent/90 hover:text-bg"
          >
            View API Docs
          </Link>
          <a
            href="https://github.com/nichochar/clawd-files"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center rounded-md border border-border bg-surface px-6 text-sm font-medium text-text transition-colors hover:bg-surface-hover hover:text-text"
          >
            Browse on GitHub
          </a>
        </div>
      </section>

      {/* ── Feature Cards ─────────────────────────────────────── */}
      <section className="pb-16 sm:pb-20">
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-lg border border-border bg-surface p-6 transition-colors hover:border-accent/30 hover:bg-surface-hover"
            >
              <div className="mb-3 font-code text-sm text-accent">
                {feature.icon}
              </div>
              <h3 className="font-heading text-xl text-text">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Code Example ──────────────────────────────────────── */}
      <section className="pb-20 sm:pb-28">
        <h2 className="mb-1 font-heading text-2xl text-text sm:text-3xl">
          Quick start
        </h2>
        <p className="mb-6 text-sm text-text-muted">
          Three requests. That&apos;s it.
        </p>
        <div
          className="overflow-x-auto rounded-lg border border-border bg-surface [&_pre]:!bg-transparent [&_pre]:!p-5 [&_code]:text-[13px] [&_code]:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: highlightedCurl }}
        />
        <p className="mt-4 text-center text-xs text-text-muted">
          Built from the deep by Clawd 🦀
        </p>
      </section>
    </PageShell>
  );
}
