import { PageShell } from "@/components/page-shell";
import { highlight } from "@/lib/highlight";
import Link from "next/link";

const FEATURES = [
  {
    title: "Buckets",
    description:
      "Organize files into buckets with automatic expiry. Set retention from 1 hour to forever — expired buckets are cleaned up automatically.",
    icon: "{}",
    glyph: "◆",
  },
  {
    title: "API-First",
    description:
      "REST API designed for LLM agents with clean JSON responses, helpful error hints, and content negotiation built in.",
    icon: ">>",
    glyph: "▸",
  },
  {
    title: "File Previews",
    description:
      "Syntax highlighting for 20+ languages, markdown rendering, image/audio/video playback — all server-rendered.",
    icon: "/*",
    glyph: "◇",
  },
  {
    title: "Self-Hosted",
    description:
      "SQLite + local filesystem. Single container, Docker-ready, zero external dependencies. Your files stay on your machine.",
    icon: "$_",
    glyph: "▪",
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
  // SECURITY: The HTML output is from Shiki operating on static code strings
  // defined above, not user input. Shiki escapes all content and produces
  // only safe <pre>/<code>/<span> elements with style attributes.
  const highlightedCurl = await highlight(CURL_EXAMPLE, "bash");

  return (
    <PageShell>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center pt-28 pb-20 sm:pt-36 sm:pb-24">
        {/* Background glow orb */}
        <div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{
            background:
              "radial-gradient(circle, #22d3ee 0%, transparent 70%)",
          }}
        />

        {/* Station status line */}
        <div className="flex items-center gap-2 mb-8 text-xs text-text-muted font-code tracking-wider uppercase">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent pulse-glow" />
          <span>Station Online</span>
          <span className="text-border">—</span>
          <span>Depth: Abyssal</span>
        </div>

        <h1
          className="font-heading text-5xl tracking-tight text-text sm:text-6xl lg:text-7xl text-center"
          style={{
            textShadow: "0 0 60px rgba(34, 211, 238, 0.12)",
          }}
        >
          Clawd Files
        </h1>

        <p className="mt-4 text-center font-code text-base text-accent sm:text-lg tracking-wide">
          File hosting from the deep
        </p>

        <p className="mt-4 max-w-md text-center text-sm leading-relaxed text-text-muted">
          Upload, organize, and share files through a clean REST API.
          Bucket-based storage with automatic expiry, syntax-highlighted
          previews, and endpoints built for LLM agents.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/docs" className="btn btn-primary glow-cyan-hover">
              View API Docs
          </Link>
          <a
              className="btn btn-outline"
              href="https://github.com/nichochar/clawd-files"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
          </a>
        </div>

        {/* Decorative depth marker */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
          <div className="w-px h-12 bg-gradient-to-b from-border to-transparent" />
        </div>
      </section>

      {/* ── Feature Cards ─────────────────────────────────────── */}
      <section className="pb-20 sm:pb-24">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <span className="text-xs text-text-muted font-code uppercase tracking-widest">Systems</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group relative rounded-lg border border-border bg-surface/80 p-6 transition-all duration-300 hover:border-accent/30 hover:bg-surface glow-cyan-hover"
            >
              {/* Corner accent */}
              <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-accent/20 rounded-tr-lg pointer-events-none" />

              <div className="flex items-center gap-3 mb-3">
                <span className="text-accent/60 text-xs">{feature.glyph}</span>
                <span className="font-code text-xs text-accent tracking-wider">
                  {feature.icon}
                </span>
              </div>
              <h3 className="font-heading text-lg text-text">
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
      <section className="pb-24 sm:pb-32">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <span className="text-xs text-text-muted font-code uppercase tracking-widest">Transmission</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        <h2 className="mb-1 font-heading text-2xl text-text sm:text-3xl">
          Quick start
        </h2>
        <p className="mb-6 text-sm text-text-muted">
          Three requests. That&apos;s it.
        </p>

        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          {/* Terminal header bar */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-bg/50">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-warm/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-accent/30" />
              <span className="w-2.5 h-2.5 rounded-full bg-border" />
            </div>
            <span className="ml-2 text-xs text-text-muted font-code">terminal — bash</span>
          </div>

          {/* SECURITY: Shiki-highlighted code from trusted static strings (not user input) */}
          <div
            className="overflow-x-auto [&_pre]:!bg-transparent [&_pre]:!p-5 [&_code]:text-[13px] [&_code]:leading-relaxed"
            dangerouslySetInnerHTML={{ __html: highlightedCurl }}
          />
        </div>

      </section>
    </PageShell>
  );
}
