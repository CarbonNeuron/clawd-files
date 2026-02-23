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
  { key: "buckets" as const, label: "Buckets" },
  { key: "files" as const, label: "Files" },
  { key: "storageBytes" as const, label: "Storage", format: formatStorage },
  { key: "apiKeys" as const, label: "API Keys" },
];

export function StatsCards(props: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {STATS_CONFIG.map(({ key, label, format }) => (
        <Card key={key} className="border-border bg-surface">
          <CardContent className="pt-0">
            <p className="font-heading text-3xl text-text">
              {format ? format(props[key]) : props[key].toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-text-muted">{label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
