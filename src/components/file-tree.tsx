"use client";

import { useState } from "react";
import Link from "next/link";
import { Folder, FileText, List, LayoutGrid } from "lucide-react";
import { encodePath } from "@/lib/urls";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm"]);

interface FileEntry {
  path: string;
  size: number;
  mimeType: string;
  createdAt: number;
}

interface FileTreeProps {
  bucketId: string;
  bucketName: string;
  files: FileEntry[];
  currentPath: string;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getExtBadge(name: string): string | null {
  const dot = name.lastIndexOf(".");
  if (dot === -1) return null;
  return name.slice(dot + 1).toUpperCase();
}

function getExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot === -1) return "";
  return name.slice(dot).toLowerCase();
}

interface TreeEntry {
  name: string;
  isFolder: boolean;
  path: string;
  size: number;
  createdAt: number;
  mimeType: string;
}

function buildTreeEntries(
  files: FileEntry[],
  currentPath: string
): TreeEntry[] {
  const entries = new Map<string, TreeEntry>();

  for (const file of files) {
    // Only consider files under the current path
    if (currentPath && !file.path.startsWith(currentPath)) {
      continue;
    }
    if (!currentPath && file.path.includes("/")) {
      // At root level, extract the top-level folder
      const topFolder = file.path.split("/")[0];
      const key = topFolder + "/";
      if (!entries.has(key)) {
        entries.set(key, {
          name: topFolder,
          isFolder: true,
          path: topFolder + "/",
          size: 0,
          createdAt: file.createdAt,
          mimeType: "",
        });
      }
      const existing = entries.get(key)!;
      existing.size += file.size;
      continue;
    }
    if (!currentPath && !file.path.includes("/")) {
      // Root-level file
      entries.set(file.path, {
        name: file.path,
        isFolder: false,
        path: file.path,
        size: file.size,
        createdAt: file.createdAt,
        mimeType: file.mimeType,
      });
      continue;
    }

    // Inside a folder (currentPath is set)
    const relativePath = file.path.slice(currentPath.length);
    if (relativePath.includes("/")) {
      // Sub-folder
      const subFolder = relativePath.split("/")[0];
      const key = currentPath + subFolder + "/";
      if (!entries.has(key)) {
        entries.set(key, {
          name: subFolder,
          isFolder: true,
          path: currentPath + subFolder + "/",
          size: 0,
          createdAt: file.createdAt,
          mimeType: "",
        });
      }
      const existing = entries.get(key)!;
      existing.size += file.size;
    } else {
      // File at this level
      entries.set(file.path, {
        name: relativePath,
        isFolder: false,
        path: file.path,
        size: file.size,
        createdAt: file.createdAt,
        mimeType: file.mimeType,
      });
    }
  }

  // Sort: folders first, then files, alphabetically
  const sorted = Array.from(entries.values()).sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;
    return a.name.localeCompare(b.name);
  });

  return sorted;
}

function Breadcrumbs({
  bucketId,
  bucketName,
  currentPath,
}: {
  bucketId: string;
  bucketName: string;
  currentPath: string;
}) {
  const segments = currentPath
    ? currentPath.replace(/\/$/, "").split("/")
    : [];

  return (
    <nav aria-label="Breadcrumb" className="overflow-x-auto font-code">
      <ol className="flex items-center gap-1.5 text-sm">
        <li>
          <Link href={`/${bucketId}`} className="text-text-muted hover:text-accent">
            {bucketName}
          </Link>
        </li>
        {segments.map((segment, i) => {
          const path = segments.slice(0, i + 1).join("/") + "/";
          const isLast = i === segments.length - 1;
          return (
            <li key={path} className="flex items-center gap-1.5">
              <span className="text-text-muted/50">/</span>
              {isLast ? (
                <span className="text-text" aria-current="page">{segment}</span>
              ) : (
                <Link
                  href={`/${bucketId}?path=${encodeURIComponent(path)}`}
                  className="text-text-muted hover:text-accent"
                >
                  {segment}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ListView({
  entries,
  bucketId,
}: {
  entries: TreeEntry[];
  bucketId: string;
}) {
  return (
    <div className="rounded-lg border border-border overflow-hidden bg-surface/50">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg/30">
              <th className="text-left text-text-muted font-code text-xs uppercase tracking-wider px-4 py-2">Name</th>
              <th className="text-left text-text-muted w-20 text-right font-code text-xs uppercase tracking-wider hidden sm:table-cell px-4 py-2">
                Type
              </th>
              <th className="text-left text-text-muted w-24 text-right font-code text-xs uppercase tracking-wider px-4 py-2">
                Size
              </th>
              <th className="text-left text-text-muted w-44 text-right font-code text-xs uppercase tracking-wider hidden md:table-cell px-4 py-2">
                Modified
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-2 text-center text-text-muted py-12 font-code text-sm"
                >
                  No files in this directory
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr
                  key={entry.path}
                  className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors"
                >
                  <td className="px-4 py-2">
                    <Link
                      href={
                        entry.isFolder
                          ? `/${bucketId}?path=${encodeURIComponent(entry.path)}`
                          : `/${bucketId}/${encodePath(entry.path)}`
                      }
                      prefetch={false}
                      className="flex items-center gap-2.5 text-text hover:text-accent transition-colors"
                    >
                      {entry.isFolder ? (
                        <Folder className="size-4 text-accent-warm shrink-0" />
                      ) : (
                        <FileText className="size-4 text-text-muted/60 shrink-0" />
                      )}
                      <span className="font-code text-sm">
                        {entry.name}
                        {entry.isFolder ? "/" : ""}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-right hidden sm:table-cell">
                    {!entry.isFolder && getExtBadge(entry.name) ? (
                      <span className="inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-code font-medium bg-accent-warm/10 text-accent-warm border-accent-warm/20">
                        {getExtBadge(entry.name)}
                      </span>
                    ) : entry.isFolder ? (
                      <span className="text-xs text-text-muted/50 font-code">dir</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2 text-right text-text-muted font-code text-xs">
                    {entry.isFolder ? "\u2014" : formatSize(entry.size)}
                  </td>
                  <td className="px-4 py-2 text-right text-text-muted font-code text-xs hidden md:table-cell">
                    {formatDate(entry.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GridView({
  entries,
  bucketId,
}: {
  entries: TreeEntry[];
  bucketId: string;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface/50 py-12 text-center text-text-muted font-code text-sm">
        No files in this directory
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {entries.map((entry) => {
        const ext = getExtension(entry.name);
        const isImage = IMAGE_EXTENSIONS.has(ext);
        const isVideo = VIDEO_EXTENSIONS.has(ext);
        const href = entry.isFolder
          ? `/${bucketId}?path=${encodeURIComponent(entry.path)}`
          : `/${bucketId}/${encodePath(entry.path)}`;
        const rawUrl = `/raw/${bucketId}/${encodePath(entry.path)}`;

        return (
          <Link
            key={entry.path}
            href={href}
            prefetch={false}
            className="group rounded-lg border border-border bg-surface/50 overflow-hidden hover:border-accent/30 transition-colors"
          >
            <div className="aspect-square bg-bg/30 relative overflow-hidden">
              {entry.isFolder ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Folder className="size-12 text-accent-warm/70" />
                </div>
              ) : isImage ? (
                <img
                  src={rawUrl}
                  alt={entry.name}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : isVideo ? (
                <video
                  src={rawUrl}
                  preload="metadata"
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileText className="size-12 text-text-muted/40" />
                </div>
              )}
            </div>
            <div className="px-2.5 py-2 space-y-0.5">
              <p className="text-sm font-code truncate text-text group-hover:text-accent transition-colors">
                {entry.name}{entry.isFolder ? "/" : ""}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted font-code">
                  {entry.isFolder ? "Folder" : formatSize(entry.size)}
                </span>
                {!entry.isFolder && getExtBadge(entry.name) && (
                  <span className="inline-flex items-center rounded border px-1 py-0 text-[9px] font-code font-medium bg-accent-warm/10 text-accent-warm border-accent-warm/20">
                    {getExtBadge(entry.name)}
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function FileTree({
  bucketId,
  bucketName,
  files,
  currentPath,
}: FileTreeProps) {
  const [view, setView] = useState<"list" | "grid">("list");
  const entries = buildTreeEntries(files, currentPath);

  return (
    <div>
      <div className="flex items-center justify-between py-3">
        <Breadcrumbs
          bucketId={bucketId}
          bucketName={bucketName}
          currentPath={currentPath}
        />
        <div className="flex items-center rounded-full border border-border bg-bg/50 p-0.5 shrink-0 ml-3">
          <button
            onClick={() => setView("list")}
            className={`rounded-full p-1.5 transition-colors ${
              view === "list"
                ? "bg-surface text-accent shadow-sm"
                : "text-text-muted hover:text-text"
            }`}
            aria-label="List view"
          >
            <List className="size-3.5" />
          </button>
          <button
            onClick={() => setView("grid")}
            className={`rounded-full p-1.5 transition-colors ${
              view === "grid"
                ? "bg-surface text-accent shadow-sm"
                : "text-text-muted hover:text-text"
            }`}
            aria-label="Grid view"
          >
            <LayoutGrid className="size-3.5" />
          </button>
        </div>
      </div>

      {view === "list" ? (
        <ListView entries={entries} bucketId={bucketId} />
      ) : (
        <GridView entries={entries} bucketId={bucketId} />
      )}
    </div>
  );
}

export { type FileEntry };
