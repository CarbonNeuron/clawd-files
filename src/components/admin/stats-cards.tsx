import { Card, CardContent } from "@/components/ui/card";

type StatsCardsProps = {
  buckets: number;
  files: number;
  storageBytes: number;
  apiKeys: number;
};

function formatStorage(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const STATS_CONFIG = [
  { key: "buckets" as const, label: "Buckets", glyph: "◆" },
  { key: "files" as const, label: "Files", glyph: "▸" },
  { key: "storageBytes" as const, label: "Storage", format: formatStorage, glyph: "◇" },
  { key: "apiKeys" as const, label: "API Keys", glyph: "▪" },
];

export function StatsCards(props: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {STATS_CONFIG.map(({ key, label, format, glyph }) => (
        <Card key={key} className="rounded-lg border-border bg-surface/80 p-0 py-0 glow-cyan-hover transition-all">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-accent/50 text-xs">{glyph}</span>
              <p className="text-xs text-text-muted font-code uppercase tracking-wider">{label}</p>
            </div>
            <p className="font-heading text-3xl text-text">
              {format ? format(props[key]) : props[key].toLocaleString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
