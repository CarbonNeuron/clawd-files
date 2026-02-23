import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
        <Separator variant="gradientLeft" className="flex-1" />
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
          <Badge className="bg-emerald-900/40 text-emerald-400 border-emerald-800/50 text-xs font-code">
            Permanent
          </Badge>
        ) : (
          <Badge className="bg-accent-warm/10 text-accent-warm border-accent-warm/20 text-xs font-code">
            {remaining !== null ? formatTimeRemaining(remaining) : "Expired"}
          </Badge>
        )}

        <Badge className="bg-surface text-text-muted border-border text-xs font-code">
          {fileCount} {fileCount === 1 ? "file" : "files"}
        </Badge>
      </div>

      <div>
        <Button asChild size="sm" variant="outline" className="glow-cyan-hover">
          <a href={`/api/buckets/${id}/zip`}>
            <Download className="size-4" />
            Download ZIP
          </a>
        </Button>
      </div>
    </div>
  );
}
