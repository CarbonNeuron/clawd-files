"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
      <Card className="overflow-x-auto rounded-lg border-border p-0 py-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              {headers.map((header, i) => (
                <TableHead
                  key={i}
                  className="text-text-muted cursor-pointer select-none hover:text-text"
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
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.map((row, rowIndex) => (
              <TableRow
                key={rowIndex}
                className="border-border hover:bg-surface-hover"
              >
                {headers.map((_, colIndex) => (
                  <TableCell key={colIndex} className="text-text">
                    {row[colIndex] || ""}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {isTruncated && (
        <p className="mt-3 text-sm text-text-muted">
          Showing {MAX_DISPLAY_ROWS} of {totalRows} rows
        </p>
      )}
    </div>
  );
}
