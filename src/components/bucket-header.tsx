import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-4 py-8">
      <h1 className="font-heading text-4xl tracking-tight text-text sm:text-5xl">
        {name}
      </h1>

      <p className="text-text-muted">
        by <span className="text-text">{owner}</span>
        {forField && (
          <>
            {" "}
            for <span className="text-text">{forField}</span>
          </>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {expiresAt === null ? (
          <Badge className="bg-emerald-900/50 text-emerald-400 border-emerald-800">
            Permanent
          </Badge>
        ) : (
          <Badge className="bg-orange-900/50 text-accent-warm border-orange-800">
            {remaining !== null ? formatTimeRemaining(remaining) : "Expired"}
          </Badge>
        )}

        <Badge variant="secondary">
          {fileCount} {fileCount === 1 ? "file" : "files"}
        </Badge>
      </div>

      <div className="pt-2">
        <Button asChild size="sm" variant="outline">
          <a href={`/api/buckets/${id}/zip`}>
            <Download className="size-4" />
            Download ZIP
          </a>
        </Button>
      </div>
    </div>
  );
}
