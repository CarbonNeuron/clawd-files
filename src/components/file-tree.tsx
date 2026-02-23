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
    <nav className="flex items-center gap-1 text-sm text-text-muted py-3 overflow-x-auto">
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
          <span key={path} className="flex items-center gap-1">
            <ChevronRight className="size-3 text-text-muted shrink-0" />
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

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-text-muted">Name</TableHead>
              <TableHead className="text-text-muted w-28 text-right">
                Size
              </TableHead>
              <TableHead className="text-text-muted w-44 text-right hidden sm:table-cell">
                Modified
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center text-text-muted py-8"
                >
                  No files in this directory
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow
                  key={entry.path}
                  className="border-border hover:bg-surface-hover"
                >
                  <TableCell>
                    <Link
                      href={
                        entry.isFolder
                          ? `/${bucketId}?path=${encodeURIComponent(entry.path)}`
                          : `/${bucketId}/${entry.path}`
                      }
                      className="flex items-center gap-2 text-text hover:text-accent"
                    >
                      {entry.isFolder ? (
                        <Folder className="size-4 text-accent-warm shrink-0" />
                      ) : (
                        <FileText className="size-4 text-text-muted shrink-0" />
                      )}
                      <span>
                        {entry.name}
                        {entry.isFolder ? "/" : ""}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-right text-text-muted">
                    {entry.isFolder ? "--" : formatSize(entry.size)}
                  </TableCell>
                  <TableCell className="text-right text-text-muted hidden sm:table-cell">
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
