"use client";

import { useState, useMemo } from "react";

interface CsvPreviewProps {
  content: string;
}

const MAX_DISPLAY_ROWS = 500;

function parseCsv(content: string): string[][] {
  const lines = content.trim().split("\n");
  return lines.map((line) =>
    line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))
  );
}

export function CsvPreview({ content }: CsvPreviewProps) {
  const rows = useMemo(() => parseCsv(content), [content]);
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  if (rows.length === 0) {
    return (
      <p className="text-text-muted text-sm py-4">No data to display</p>
    );
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);
  const totalRows = dataRows.length;

  const sortedRows = useMemo(() => {
    if (sortColumn === null) return dataRows;
    return [...dataRows].sort((a, b) => {
      const aVal = a[sortColumn] || "";
      const bVal = b[sortColumn] || "";
      // Try numeric comparison
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortAsc ? aNum - bNum : bNum - aNum;
      }
      return sortAsc
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });
  }, [dataRows, sortColumn, sortAsc]);

  const displayRows = sortedRows.slice(0, MAX_DISPLAY_ROWS);
  const isTruncated = totalRows > MAX_DISPLAY_ROWS;

  function handleSort(colIndex: number) {
    if (sortColumn === colIndex) {
      setSortAsc(!sortAsc);
    } else {
      setSortColumn(colIndex);
      setSortAsc(true);
    }
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg/30">
              {headers.map((header, i) => (
                <th
                  key={i}
                  className="text-left text-xs text-text-muted font-code uppercase tracking-wider px-4 py-2 cursor-pointer select-none hover:text-text"
                  onClick={() => handleSort(i)}
                >
                  <span className="flex items-center gap-1">
                    {header}
                    {sortColumn === i && (
                      <span className="text-accent text-xs">
                        {sortAsc ? "\u25B2" : "\u25BC"}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-border hover:bg-surface-hover transition-colors"
              >
                {headers.map((_, colIndex) => (
                  <td key={colIndex} className="px-4 py-2 text-text">
                    {row[colIndex] || ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isTruncated && (
        <p className="mt-3 text-sm text-text-muted">
          Showing {MAX_DISPLAY_ROWS} of {totalRows} rows
        </p>
      )}
    </div>
  );
}
