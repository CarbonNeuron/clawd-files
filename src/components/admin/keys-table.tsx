"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type KeyRow = {
  prefix: string;
  name: string;
  createdAt: number;
  lastUsedAt: number;
  bucketCount: number;
};

type KeysTableProps = {
  keys: KeyRow[];
  token: string;
};

function relativeTime(epochSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - epochSeconds;

  if (diff < 0) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 2592000)}mo ago`;
}

export function KeysTable({ keys: initialKeys, token }: KeysTableProps) {
  const [keys, setKeys] = useState(initialKeys);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revoked, setRevoked] = useState<string | null>(null);

  async function handleRevoke(prefix: string) {
    setRevoking(prefix);
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "revoke_key", target: prefix }),
      });

      if (res.ok) {
        setRevoked(prefix);
        setTimeout(() => {
          setKeys((prev) => prev.filter((k) => k.prefix !== prefix));
          setRevoked(null);
        }, 1500);
      }
    } finally {
      setRevoking(null);
    }
  }

  if (keys.length === 0) {
    return (
      <p className="text-sm text-text-muted">No API keys found.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border">
          <TableHead className="text-text-muted">Prefix</TableHead>
          <TableHead className="text-text-muted">Name</TableHead>
          <TableHead className="text-text-muted">Created</TableHead>
          <TableHead className="text-text-muted">Last Used</TableHead>
          <TableHead className="text-text-muted">Buckets</TableHead>
          <TableHead className="text-text-muted">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {keys.map((key) => (
          <TableRow key={key.prefix} className="border-border">
            <TableCell className="font-code text-accent">
              {key.prefix}
            </TableCell>
            <TableCell className="text-text">{key.name}</TableCell>
            <TableCell className="text-text-muted">
              {relativeTime(key.createdAt)}
            </TableCell>
            <TableCell className="text-text-muted">
              {relativeTime(key.lastUsedAt)}
            </TableCell>
            <TableCell className="text-text-muted">
              {key.bucketCount}
            </TableCell>
            <TableCell>
              {revoked === key.prefix ? (
                <span className="text-sm text-accent">Revoked</span>
              ) : (
                <Button
                  variant="destructive"
                  size="xs"
                  onClick={() => handleRevoke(key.prefix)}
                  disabled={revoking === key.prefix}
                >
                  {revoking === key.prefix ? "Revoking..." : "Revoke"}
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
