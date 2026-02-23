"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <Table>
      <TableHeader>
        <TableRow className="border-border">
          <TableHead className="text-text-muted">ID</TableHead>
          <TableHead className="text-text-muted">Name</TableHead>
          <TableHead className="text-text-muted">Owner</TableHead>
          <TableHead className="text-text-muted">Files</TableHead>
          <TableHead className="text-text-muted">Created</TableHead>
          <TableHead className="text-text-muted">Expires</TableHead>
          <TableHead className="text-text-muted">Status</TableHead>
          <TableHead className="text-text-muted">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {buckets.map((bucket) => {
          const status = getStatus(bucket.expiresAt);
          return (
            <TableRow key={bucket.id} className="border-border">
              <TableCell className="font-code text-accent">
                <Link href={`/${bucket.id}`} title={bucket.id}>
                  {bucket.id.slice(0, 8)}...
                </Link>
              </TableCell>
              <TableCell className="text-text">{bucket.name}</TableCell>
              <TableCell className="text-text-muted">{bucket.owner}</TableCell>
              <TableCell className="text-text-muted">
                {bucket.fileCount}
              </TableCell>
              <TableCell className="text-text-muted">
                {relativeTime(bucket.createdAt)}
              </TableCell>
              <TableCell className="text-text-muted">
                {bucket.expiresAt ? relativeTime(bucket.expiresAt) : "Never"}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`rounded-md border text-xs ${status.className}`}
                >
                  {status.label}
                </Badge>
              </TableCell>
              <TableCell>
                {deleted === bucket.id ? (
                  <span className="text-sm text-accent">Deleted</span>
                ) : (
                  <Button
                    variant="destructive"
                    size="xs"
                    onClick={() => handleDelete(bucket.id)}
                    disabled={deleting === bucket.id}
                  >
                    {deleting === bucket.id ? "Deleting..." : "Delete"}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
