import type { Metadata } from "next";
import { db } from "@/lib/db";
import { buckets } from "@/lib/schema";
import { verifyUploadToken } from "@/lib/auth";
import { isExpired } from "@/lib/expiry";
import { eq } from "drizzle-orm";
import { PageShell } from "@/components/page-shell";
import { UploadForm } from "@/components/upload-form";

export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: "Upload Files — Clawd Files",
  description: "Upload files to a shared bucket",
};

export default async function UploadPage({
  params,
  searchParams,
}: {
  params: Promise<{ bucket: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { bucket: bucketId } = await params;
  const { token } = await searchParams;

  // Validate token
  if (!token) {
    return (
      <PageShell>
        <ErrorMessage
          title="Missing upload token"
          hint="This upload link is incomplete. Ask the sender for a new link."
        />
      </PageShell>
    );
  }

  const result = verifyUploadToken(token);
  if (!result) {
    return (
      <PageShell>
        <ErrorMessage
          title="Invalid or expired upload link"
          hint="This upload link has expired or is invalid. Ask the sender for a new link."
        />
      </PageShell>
    );
  }

  if (result.bucketId !== bucketId) {
    return (
      <PageShell>
        <ErrorMessage
          title="Invalid upload link"
          hint="This upload link does not match this bucket."
        />
      </PageShell>
    );
  }

  // Check bucket exists
  const bucket = db.select().from(buckets).where(eq(buckets.id, bucketId)).get();
  if (!bucket || isExpired(bucket.expiresAt)) {
    return (
      <PageShell>
        <ErrorMessage
          title="Bucket not found"
          hint="This bucket does not exist or has expired."
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-heading font-semibold text-text mb-2">
            Upload to {bucket.name}
          </h1>
          <p className="text-sm text-text-muted font-code">
            by {bucket.owner}
          </p>
        </div>

        <UploadForm bucketId={bucketId} token={token} />
      </div>
    </PageShell>
  );
}

function ErrorMessage({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="py-24 text-center">
      <div className="inline-block rounded-lg border border-border bg-surface p-8 max-w-md">
        <h1 className="text-lg font-heading font-semibold text-accent-warm mb-2">
          {title}
        </h1>
        <p className="text-sm text-text-muted">{hint}</p>
      </div>
    </div>
  );
}
