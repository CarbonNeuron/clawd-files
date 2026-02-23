"use client";

import { useState } from "react";
import Link from "next/link";

export type BucketRow = {
  id: string;
  name: string;
  owner: string;
  fileCount: number;
  createdAt: number;
  expiresAt: number | null;
};

type BucketsTableProps = {
  buckets: BucketRow[];
  token: string;
};

function relativeTime(epochSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - epochSeconds;

  if (diff < 0) {
    // Future time - show time until
    const absDiff = Math.abs(diff);
    if (absDiff < 3600) return `in ${Math.floor(absDiff / 60)}m`;
    if (absDiff < 86400) return `in ${Math.floor(absDiff / 3600)}h`;
    return `in ${Math.floor(absDiff / 86400)}d`;
  }
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 2592000)}mo ago`;
}

function getStatus(expiresAt: number | null): {
  label: string;
  className: string;
} {
  if (expiresAt === null) {
    return {
      label: "Permanent",
      className: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const hoursLeft = (expiresAt - now) / 3600;

  if (hoursLeft < 0) {
    return {
      label: "Expired",
      className: "bg-red-500/15 text-red-400 border-red-500/30",
    };
  }

  if (hoursLeft < 24) {
    return {
      label: "Expiring",
      className: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    };
  }

  return {
    label: "Active",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  };
}

export function BucketsTable({
  buckets: initialBuckets,
  token,
}: BucketsTableProps) {
  const [buckets, setBuckets] = useState(initialBuckets);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "delete_bucket", target: id }),
      });

      if (res.ok) {
        setDeleted(id);
        setTimeout(() => {
          setBuckets((prev) => prev.filter((b) => b.id !== id));
          setDeleted(null);
        }, 1500);
      }
    } finally {
      setDeleting(null);
    }
  }

  if (buckets.length === 0) {
    return (
      <p className="text-sm text-text-muted">No buckets found.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2">ID</th>
            <th className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2">Name</th>
            <th className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2">Owner</th>
            <th className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2">Files</th>
            <th className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2">Created</th>
            <th className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2">Expires</th>
            <th className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2">Status</th>
            <th className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((bucket) => {
            const status = getStatus(bucket.expiresAt);
            return (
              <tr key={bucket.id} className="border-b border-border hover:bg-surface-hover/50 transition-colors">
                <td className="px-4 py-2 font-code text-accent">
                  <Link href={`/${bucket.id}`} title={bucket.id}>
                    {bucket.id.slice(0, 8)}...
                  </Link>
                </td>
                <td className="px-4 py-2 text-text">{bucket.name}</td>
                <td className="px-4 py-2 text-text-muted">{bucket.owner}</td>
                <td className="px-4 py-2 text-text-muted">
                  {bucket.fileCount}
                </td>
                <td className="px-4 py-2 text-text-muted">
                  {relativeTime(bucket.createdAt)}
                </td>
                <td className="px-4 py-2 text-text-muted">
                  {bucket.expiresAt ? relativeTime(bucket.expiresAt) : "Never"}
                </td>
                <td className="px-4 py-2">
                  <span className={`inline-flex items-center rounded-md border text-xs px-2 py-0.5 font-code ${status.className}`}>
                    {status.label}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {deleted === bucket.id ? (
                    <span className="text-sm text-accent">Deleted</span>
                  ) : (
                    <button
                      className="btn btn-destructive btn-xs"
                      onClick={() => handleDelete(bucket.id)}
                      disabled={deleting === bucket.id}
                    >
                      {deleting === bucket.id ? "Deleting..." : "Delete"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
