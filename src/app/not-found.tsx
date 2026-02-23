import { PageShell } from "@/components/page-shell";
import Link from "next/link";

export default function NotFound() {
  return (
    <PageShell>
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        {/* Depth indicator */}
        <div className="flex items-center gap-2 mb-8 text-xs text-text-muted font-code tracking-wider uppercase">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500/60 animate-pulse" />
          <span>Signal Lost</span>
        </div>

        {/* Glowing 404 */}
        <h1
          className="font-heading text-8xl tracking-tight text-accent sm:text-9xl"
          style={{ textShadow: "0 0 80px rgba(34, 211, 238, 0.2), 0 0 40px rgba(34, 211, 238, 0.1)" }}
        >
          404
        </h1>

        <p className="mt-4 font-code text-base text-text-muted sm:text-lg tracking-wide">
          Nothing at this depth
        </p>

        <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-muted/60">
          The file or bucket you&apos;re looking for has expired, moved, or never existed.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/" className="btn btn-primary glow-cyan-hover">
            Return to Surface
          </Link>
          <Link href="/docs" className="btn btn-outline">
            API Docs
          </Link>
        </div>

        {/* Decorative sonar ping */}
        <div className="relative mt-16">
          <div className="w-px h-16 bg-gradient-to-b from-accent/20 to-transparent" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-accent/30" />
        </div>
      </div>
    </PageShell>
  );
}
