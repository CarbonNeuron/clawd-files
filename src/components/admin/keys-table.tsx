"use client";

import { useState } from "react";

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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2">Prefix</th>
            <th className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2">Name</th>
            <th className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2">Created</th>
            <th className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2">Last Used</th>
            <th className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2">Buckets</th>
            <th className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => (
            <tr key={key.prefix} className="border-b border-border hover:bg-surface-hover/50 transition-colors">
              <td className="px-4 py-2 font-code text-accent">
                {key.prefix}
              </td>
              <td className="px-4 py-2 text-text">{key.name}</td>
              <td className="px-4 py-2 text-text-muted">
                {relativeTime(key.createdAt)}
              </td>
              <td className="px-4 py-2 text-text-muted">
                {relativeTime(key.lastUsedAt)}
              </td>
              <td className="px-4 py-2 text-text-muted">
                {key.bucketCount}
              </td>
              <td className="px-4 py-2">
                {revoked === key.prefix ? (
                  <span className="text-sm text-accent">Revoked</span>
                ) : (
                  <button
                    className="btn btn-destructive btn-xs"
                    onClick={() => handleRevoke(key.prefix)}
                    disabled={revoking === key.prefix}
                  >
                    {revoking === key.prefix ? "Revoking..." : "Revoke"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
