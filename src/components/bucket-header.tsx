import { secondsRemaining } from "@/lib/expiry";
import { Download } from "lucide-react";

interface BucketHeaderProps {
  id: string;
  name: string;
  owner: string;
  forField: string | null;
  expiresAt: number | null;
  fileCount: number;
}

function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) return `${seconds}s remaining`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m remaining`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h remaining`;
  const days = Math.floor(seconds / 86400);
  return `${days}d remaining`;
}

export function BucketHeader({
  id,
  name,
  owner,
  forField,
  expiresAt,
  fileCount,
}: BucketHeaderProps) {
  const remaining = secondsRemaining(expiresAt);

  return (
    <div className="py-8 space-y-5">
      {/* Station-style section divider */}
      <div className="flex items-center gap-3">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent/60" />
        <span className="text-xs text-text-muted font-code uppercase tracking-widest">Bucket</span>
        <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
      </div>

      <h1 className="font-heading text-3xl tracking-tight text-text sm:text-4xl"
        style={{ textShadow: "0 0 40px rgba(34, 211, 238, 0.08)" }}
      >
        {name}
      </h1>

      <p className="text-sm text-text-muted font-code">
        by <span className="text-text">{owner}</span>
        {forField && (
          <>
            {" "}
            for <span className="text-text">{forField}</span>
          </>
        )}
      </p>

      {/* Metadata badges */}
      <div className="flex flex-wrap items-center gap-2">
        {expiresAt === null ? (
          <span className="inline-flex items-center text-xs px-2 py-0.5 rounded border bg-emerald-900/40 text-emerald-400 border-emerald-800/50 font-code">
            Permanent
          </span>
        ) : (
          <span className="inline-flex items-center text-xs px-2 py-0.5 rounded border bg-accent-warm/10 text-accent-warm border-accent-warm/20 font-code">
            {remaining !== null ? formatTimeRemaining(remaining) : "Expired"}
          </span>
        )}

        <span className="inline-flex items-center text-xs px-2 py-0.5 rounded border bg-surface text-text-muted border-border font-code">
          {fileCount} {fileCount === 1 ? "file" : "files"}
        </span>
      </div>

      <div>
        <a href={`/api/buckets/${id}/zip`} className="btn btn-outline btn-sm glow-cyan-hover">
          <Download className="size-4" />
          Download ZIP
        </a>
      </div>
    </div>
  );
}
