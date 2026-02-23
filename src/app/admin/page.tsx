import { verifyDashboardToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiKeys, buckets, files } from "@/lib/schema";
import { count, sum, eq } from "drizzle-orm";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatsCards } from "@/components/admin/stats-cards";
import { KeysTable, type KeyRow } from "@/components/admin/keys-table";
import { BucketsTable, type BucketRow } from "@/components/admin/buckets-table";
import Link from "next/link";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  // ── Auth gate ──────────────────────────────────────────────────────────
  if (!token || !verifyDashboardToken(token)) {
    return (
      <PageShell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
          <h1 className="font-heading text-3xl text-text">
            Invalid or expired dashboard token
          </h1>
          <p className="mt-4 max-w-lg text-center text-sm text-text-muted">
            Dashboard tokens expire after 24 hours. Generate a new link:
          </p>
          <Card className="mt-4 rounded-lg border-border bg-surface px-4 py-3">
            <code className="font-code text-sm text-accent whitespace-pre">
              {`curl -H 'Authorization: Bearer $ADMIN_API_KEY' \\\n  $BASE_URL/api/admin/dashboard-link`}
            </code>
          </Card>
          <Link
            href="/"
            className="mt-6 text-sm text-text-muted transition-colors hover:text-text"
          >
            Back to Home
          </Link>
        </div>
      </PageShell>
    );
  }

  // ── Stats queries ──────────────────────────────────────────────────────
  const [bucketCount] = db.select({ value: count() }).from(buckets).all();
  const [fileCount] = db.select({ value: count() }).from(files).all();
  const [storageResult] = db
    .select({ value: sum(files.size) })
    .from(files)
    .all();
  const [keyCount] = db.select({ value: count() }).from(apiKeys).all();

  const totalBuckets = bucketCount?.value ?? 0;
  const totalFiles = fileCount?.value ?? 0;
  const totalStorage = Number(storageResult?.value ?? 0);
  const totalKeys = keyCount?.value ?? 0;

  // ── Keys data ──────────────────────────────────────────────────────────
  // For each key, count how many buckets it owns
  const allKeys = db.select().from(apiKeys).all();
  const keyRows: KeyRow[] = allKeys.map((k) => {
    const [bucketCountForKey] = db
      .select({ value: count() })
      .from(buckets)
      .where(eq(buckets.keyHash, k.key))
      .all();
    return {
      prefix: k.prefix,
      name: k.name,
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
      bucketCount: bucketCountForKey?.value ?? 0,
    };
  });

  // ── Buckets data ───────────────────────────────────────────────────────
  const allBuckets = db.select().from(buckets).all();
  const bucketRows: BucketRow[] = allBuckets.map((b) => {
    const [fileCountForBucket] = db
      .select({ value: count() })
      .from(files)
      .where(eq(files.bucketId, b.id))
      .all();
    return {
      id: b.id,
      name: b.name,
      owner: b.owner,
      fileCount: fileCountForBucket?.value ?? 0,
      createdAt: b.createdAt,
      expiresAt: b.expiresAt,
    };
  });

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <PageShell>
      <div className="py-12 sm:py-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-warm/60" />
            <span className="text-xs text-text-muted font-code uppercase tracking-widest">Admin</span>
            <Separator variant="gradientLeft" className="flex-1" />
          </div>

          <h1 className="font-heading text-3xl text-text sm:text-4xl"
            style={{ textShadow: "0 0 40px rgba(34, 211, 238, 0.08)" }}
          >
            Admin Dashboard
          </h1>
          <p className="mt-2 text-sm text-text-muted font-code">
            System overview and management for Clawd Files.
          </p>
        </div>

        {/* Stats */}
        <StatsCards
          buckets={totalBuckets}
          files={totalFiles}
          storageBytes={totalStorage}
          apiKeys={totalKeys}
        />

        {/* API Keys */}
        <section className="mt-12">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-heading text-xl text-text">API Keys</h2>
            <Separator variant="gradientLeft" className="flex-1" />
          </div>
          <Card className="rounded-lg border-border bg-surface/50 p-4 py-4 overflow-hidden">
            <KeysTable keys={keyRows} token={token} />
          </Card>
        </section>

        {/* Buckets */}
        <section className="mt-12">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-heading text-xl text-text">Buckets</h2>
            <Separator variant="gradientLeft" className="flex-1" />
          </div>
          <Card className="rounded-lg border-border bg-surface/50 p-4 py-4 overflow-hidden">
            <BucketsTable buckets={bucketRows} token={token} />
          </Card>
        </section>
      </div>
    </PageShell>
  );
}
