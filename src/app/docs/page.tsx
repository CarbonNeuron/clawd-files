import { PageShell } from "@/components/page-shell";
import { highlight } from "@/lib/highlight";
import {
  API_DOCS,
  type HttpMethod,
  type AuthLevel,
  type Endpoint,
  type EndpointGroup,
} from "@/lib/api-docs";
import Link from "next/link";

/* ── Method badge colors ──────────────────────────────────────────────── */

const METHOD_STYLES: Record<HttpMethod, string> = {
  GET: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  POST: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  PATCH: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  DELETE: "bg-red-500/15 text-red-400 border-red-500/30",
};

/* ── Auth badge styles ────────────────────────────────────────────────── */

const AUTH_STYLES: Record<AuthLevel, { label: string; className: string }> = {
  admin: { label: "Admin", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  api_key: { label: "API Key", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  owner: { label: "Owner", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  public: { label: "Public", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
};

/* ── Highlighted code block ───────────────────────────────────────────── */

function HighlightedBlock({ html, label }: { html: string; label?: string }) {
  // SECURITY: Shiki HTML is generated server-side from static code strings
  // defined in api-docs.ts — not user input. Shiki escapes all content
  // and produces only safe <pre>/<code>/<span> elements with style attrs.
  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface/50">
      {label && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-bg/30">
          <span className="text-[10px] text-text-muted/50 font-code">{label}</span>
        </div>
      )}
      {/* SECURITY: Safe Shiki output — see security comment above */}
      <div
        className="overflow-x-auto [&_pre]:!bg-transparent [&_pre]:!p-4 [&_code]:text-[13px] [&_code]:leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

/* ── Single endpoint section ──────────────────────────────────────────── */

async function EndpointSection({ endpoint }: { endpoint: Endpoint }) {
  const authInfo = AUTH_STYLES[endpoint.auth];

  // Highlight code blocks
  const responseJson = JSON.stringify(endpoint.responseExample, null, 2);
  const [responseHtml, curlHtml] = await Promise.all([
    highlight(responseJson, "json"),
    highlight(endpoint.curl, "bash"),
  ]);

  let requestHtml: string | null = null;
  if (endpoint.requestBody) {
    const requestJson = JSON.stringify(endpoint.requestBody, null, 2);
    requestHtml = await highlight(requestJson, "json");
  }

  return (
    <div className="scroll-mt-20" id={`${endpoint.method.toLowerCase()}-${endpoint.path.replace(/[/:]/g, "-").replace(/^-+|-+$/g, "")}`}>
      {/* Method + Path */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center rounded-md border font-code text-xs font-semibold px-2 py-0.5 ${METHOD_STYLES[endpoint.method]}`}>
          {endpoint.method}
        </span>
        <code className="font-code text-sm text-text">{endpoint.path}</code>
        <span className={`inline-flex items-center rounded-md border text-[10px] px-2 py-0.5 ${authInfo.className}`}>
          {authInfo.label}
        </span>
      </div>

      {/* Description */}
      <p className="mt-2 text-sm leading-relaxed text-text-muted">
        {endpoint.description}
      </p>

      {/* Request Body */}
      {requestHtml && (
        <div className="mt-4">
          <HighlightedBlock html={requestHtml} label="Request Body" />
        </div>
      )}

      {/* Response */}
      <div className="mt-4">
        <HighlightedBlock html={responseHtml} label="Response" />
      </div>

      {/* Curl */}
      <div className="mt-4">
        <HighlightedBlock html={curlHtml} label="Example" />
      </div>
    </div>
  );
}

/* ── Endpoint group ───────────────────────────────────────────────────── */

async function GroupSection({ group }: { group: EndpointGroup }) {
  return (
    <section id={group.slug} className="scroll-mt-20">
      <h2 className="font-heading text-2xl text-text">{group.name}</h2>
      <p className="mt-1 text-sm text-text-muted">{group.description}</p>

      <div className="mt-6 space-y-10">
        {group.endpoints.map((ep, i) => (
          <EndpointSection key={`${ep.method}-${ep.path}-${i}`} endpoint={ep} />
        ))}
      </div>
    </section>
  );
}

/* ── Sidebar ──────────────────────────────────────────────────────────── */

function Sidebar() {
  return (
    <nav className="sticky top-6 hidden lg:block">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">
        Endpoints
      </p>
      <ul className="space-y-1">
        {API_DOCS.map((group) => (
          <li key={group.slug}>
            <a
              href={`#${group.slug}`}
              className="block rounded-md px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface hover:text-text"
            >
              {group.name}
            </a>
            <ul className="ml-3 space-y-0.5">
              {group.endpoints.map((ep, i) => (
                <li key={`${ep.method}-${ep.path}-${i}`}>
                  <a
                    href={`#${ep.method.toLowerCase()}-${ep.path.replace(/[/:]/g, "-").replace(/^-+|-+$/g, "")}`}
                    className="flex items-center gap-1.5 rounded-md px-3 py-1 text-xs text-text-muted transition-colors hover:text-text"
                  >
                    <span
                      className={`inline-block w-8 text-center rounded font-code text-[10px] font-semibold leading-relaxed ${METHOD_STYLES[ep.method]}`}
                    >
                      {ep.method === "DELETE" ? "DEL" : ep.method}
                    </span>
                    <span className="truncate font-code">{ep.path}</span>
                  </a>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <div className="mt-6 border-t border-border pt-4">
        <a
          href="/docs/api.md"
          className="block rounded-md px-3 py-1.5 text-xs text-text-muted transition-colors hover:text-text"
        >
          Raw Markdown
        </a>
        <Link
          href="/"
          className="block rounded-md px-3 py-1.5 text-xs text-text-muted transition-colors hover:text-text"
        >
          Back to Home
        </Link>
      </div>
    </nav>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default async function DocsPage() {
  return (
    <PageShell>
      <div className="py-12 sm:py-16">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent/60" />
            <span className="text-xs text-text-muted font-code uppercase tracking-widest">Documentation</span>
            <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
          </div>

          <h1 className="font-heading text-3xl text-text sm:text-4xl"
            style={{ textShadow: "0 0 40px rgba(34, 211, 238, 0.08)" }}
          >
            API Documentation
          </h1>
          <p className="mt-2 text-sm text-text-muted font-code">
            Complete reference for the Clawd Files REST API. All responses are JSON with{" "}
            <code className="rounded bg-surface px-1.5 py-0.5 font-code text-xs text-accent">
              {"{ ok, data }"}
            </code>{" "}
            envelope.
          </p>

          {/* Auth overview */}
          <div className="mt-6 rounded-lg border border-border bg-surface/50 overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-bg/30">
              <p className="text-[10px] font-code uppercase tracking-widest text-text-muted/60">
                Authentication
              </p>
            </div>
            <div className="p-4">
              <p className="text-sm text-text-muted">
                Pass your API key via the{" "}
                <code className="rounded bg-bg px-1.5 py-0.5 font-code text-xs text-accent">
                  Authorization
                </code>{" "}
                header:
              </p>
              <pre className="mt-2 rounded-md bg-bg/50 border border-border px-3 py-2 font-code text-xs text-text">
                Authorization: Bearer cf_your_api_key
              </pre>
              <div className="mt-3 flex flex-wrap gap-2">
                {(Object.entries(AUTH_STYLES) as [AuthLevel, { label: string; className: string }][]).map(
                  ([key, info]) => (
                    <span
                      key={key}
                      className={`inline-flex items-center rounded-md border text-[10px] px-2 py-0.5 ${info.className}`}
                    >
                      {info.label}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Layout: sidebar + content */}
        <div className="flex gap-10">
          {/* Sidebar */}
          <div className="w-56 shrink-0">
            <Sidebar />
          </div>

          {/* Main content */}
          <div className="min-w-0 flex-1 space-y-16">
            {API_DOCS.map((group) => (
              <GroupSection key={group.slug} group={group} />
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
