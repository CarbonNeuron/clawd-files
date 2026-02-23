import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Folder, FileText, ChevronRight } from "lucide-react";

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

interface TreeEntry {
  name: string;
  isFolder: boolean;
  path: string;
  size: number;
  createdAt: number;
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
    <nav className="flex items-center gap-1.5 text-sm text-text-muted py-3 overflow-x-auto font-code">
      <Link
        href={`/${bucketId}`}
        className="text-accent hover:text-accent/80 shrink-0"
      >
        {bucketName}
      </Link>
      {segments.map((segment, i) => {
        const path = segments.slice(0, i + 1).join("/") + "/";
        const isLast = i === segments.length - 1;
        return (
          <span key={path} className="flex items-center gap-1.5">
            <ChevronRight className="size-3 text-text-muted/50 shrink-0" />
            {isLast ? (
              <span className="text-text">{segment}</span>
            ) : (
              <Link
                href={`/${bucketId}?path=${encodeURIComponent(path)}`}
                className="text-accent hover:text-accent/80"
              >
                {segment}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export function FileTree({
  bucketId,
  bucketName,
  files,
  currentPath,
}: FileTreeProps) {
  const entries = buildTreeEntries(files, currentPath);

  return (
    <div>
      <Breadcrumbs
        bucketId={bucketId}
        bucketName={bucketName}
        currentPath={currentPath}
      />

      <div className="rounded-lg border border-border overflow-hidden bg-surface/50">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent bg-bg/30">
              <TableHead className="text-text-muted font-code text-xs uppercase tracking-wider">Name</TableHead>
              <TableHead className="text-text-muted w-20 text-right font-code text-xs uppercase tracking-wider hidden sm:table-cell">
                Type
              </TableHead>
              <TableHead className="text-text-muted w-24 text-right font-code text-xs uppercase tracking-wider">
                Size
              </TableHead>
              <TableHead className="text-text-muted w-44 text-right font-code text-xs uppercase tracking-wider hidden md:table-cell">
                Modified
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-text-muted py-12 font-code text-sm"
                >
                  No files in this directory
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow
                  key={entry.path}
                  className="border-border/50 hover:bg-surface-hover/50 transition-colors"
                >
                  <TableCell>
                    <Link
                      href={
                        entry.isFolder
                          ? `/${bucketId}?path=${encodeURIComponent(entry.path)}`
                          : `/${bucketId}/${entry.path}`
                      }
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
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell">
                    {!entry.isFolder && getExtBadge(entry.name) ? (
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-code font-medium bg-accent-warm/10 text-accent-warm border border-accent-warm/20">
                        {getExtBadge(entry.name)}
                      </span>
                    ) : entry.isFolder ? (
                      <span className="text-xs text-text-muted/50 font-code">dir</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right text-text-muted font-code text-xs">
                    {entry.isFolder ? "—" : formatSize(entry.size)}
                  </TableCell>
                  <TableCell className="text-right text-text-muted font-code text-xs hidden md:table-cell">
                    {formatDate(entry.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export { type FileEntry };
