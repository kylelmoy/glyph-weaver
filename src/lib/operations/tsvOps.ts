/**
 * TSV operations — extract, sort, and convert tab-separated values.
 * All operations treat the first column as column 1 (1-indexed).
 */

import type { OperationDefinition } from "./types";

export const tsvOps: OperationDefinition[] = [
  {
    id: "tsv-extract-column",
    name: "Extract TSV Column",
    description: "Extract a single column from tab-separated values (1-indexed)",
    category: "TSV",
    params: [{ key: "column", label: "Column number (1-indexed)", placeholder: "1" }],
    apply: (lines, params) => {
      const col = Math.max(1, Number.parseInt(params.column ?? "") || 1) - 1;
      return lines.map((line) => line.split("\t")[col] ?? "");
    },
  },
  {
    id: "tsv-sort-by-column",
    name: "Sort by TSV Column",
    description: "Sort tab-separated lines by a specific column value",
    category: "TSV",
    params: [
      { key: "column", label: "Column number (1-indexed)", placeholder: "1" },
      { key: "numeric", label: "Numeric sort? (yes/no)", placeholder: "no" },
    ],
    apply: (lines, params) => {
      const col = Math.max(1, Number.parseInt(params.column ?? "") || 1) - 1;
      const numeric = (params.numeric ?? "").toLowerCase().startsWith("y");
      return [...lines].sort((a, b) => {
        const av = a.split("\t")[col] ?? "";
        const bv = b.split("\t")[col] ?? "";
        if (numeric) return Number.parseFloat(av) - Number.parseFloat(bv);
        return av.localeCompare(bv, undefined, { sensitivity: "base" });
      });
    },
  },
  {
    id: "tsv-to-csv",
    name: "TSV → CSV",
    description: "Convert tab-separated values to comma-separated values",
    category: "TSV",
    apply: (lines) =>
      lines.map((line) =>
        line
          .split("\t")
          .map((cell) => {
            // RFC 4180: wrap cells containing commas, double-quotes, or newlines.
            if (cell.includes(",") || cell.includes('"') || cell.includes("\n"))
              return `"${cell.replace(/"/g, '""')}"`;
            return cell;
          })
          .join(","),
      ),
  },
  {
    id: "tsv-to-json-array",
    name: "TSV → JSON Array",
    description: "Convert tab-separated lines to a JSON array of objects (first line = keys)",
    category: "TSV",
    apply: (lines) => {
      if (lines.length < 2) return lines;
      const keys = lines[0].split("\t");
      const records = lines.slice(1).map((line) => {
        const values = line.split("\t");
        return Object.fromEntries(keys.map((key, i) => [key, values[i] ?? ""]));
      });
      return [JSON.stringify(records, null, 2)].flatMap((s) => s.split("\n"));
    },
  },
];
