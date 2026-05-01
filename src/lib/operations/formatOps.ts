/**
 * Format operations — convert between structured data formats (TSV, CSV, JSON).
 * JSON operations return lines unchanged on parse failure.
 */

import type { OperationDefinition } from "./types";

export const formatOps: OperationDefinition[] = [
  {
    id: "tsv-extract-column",
    name: "Extract TSV Column",
    description: "Extract a single column from tab-separated values (1-indexed)",
    category: "Format",
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
    category: "Format",
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
    category: "Format",
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
    id: "csv-to-tsv",
    name: "CSV → TSV",
    description: "Convert comma-separated values to tab-separated values",
    category: "Format",
    apply: (lines) =>
      lines.map((line) => {
        // RFC 4180 CSV requires a character-by-character state machine because
        // regex-based splitting cannot correctly handle quoted commas or escaped
        // double-quotes (represented as "" inside a quoted field).
        const cells: string[] = [];
        let cur = "";
        let inQuote = false;

        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (inQuote) {
            if (ch === '"' && line[i + 1] === '"') {
              cur += '"'; // escaped quote ("") → literal "
              i++; // skip the second "
            } else if (ch === '"') {
              inQuote = false; // closing quote ends the field
            } else {
              cur += ch;
            }
          } else {
            if (ch === '"') {
              inQuote = true; // opening quote starts a quoted field
            } else if (ch === ",") {
              cells.push(cur);
              cur = "";
            } else {
              cur += ch;
            }
          }
        }
        cells.push(cur); // flush the final cell
        return cells.join("\t");
      }),
  },
  {
    id: "tsv-to-json-array",
    name: "TSV → JSON Array",
    description: "Convert tab-separated lines to a JSON array of objects (first line = keys)",
    category: "Format",
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
  {
    id: "lines-to-json-array",
    name: "Lines → JSON Array",
    description: "Wrap all lines as a JSON string array",
    category: "Format",
    apply: (lines) => [JSON.stringify(lines)],
  },
  {
    id: "json-array-to-lines",
    name: "JSON Array → Lines",
    description: "Expand a JSON array into one item per line",
    category: "Format",
    apply: (lines) => {
      try {
        const parsed: unknown = JSON.parse(lines.join("\n"));
        if (Array.isArray(parsed)) {
          return parsed.map((item) => (typeof item === "string" ? item : JSON.stringify(item)));
        }
      } catch {
        /* not valid JSON — fall through */
      }
      return lines;
    },
  },
  {
    id: "json-pretty",
    name: "JSON Pretty Print",
    description: "Re-format JSON with 2-space indentation",
    category: "Format",
    apply: (lines) => {
      try {
        return JSON.stringify(JSON.parse(lines.join("\n")), null, 2).split("\n");
      } catch {
        return lines; // invalid JSON — pass through unchanged
      }
    },
  },
  {
    id: "json-minify",
    name: "JSON Minify",
    description: "Compact JSON onto a single line",
    category: "Format",
    apply: (lines) => {
      try {
        return [JSON.stringify(JSON.parse(lines.join("\n")))];
      } catch {
        return lines; // invalid JSON — pass through unchanged
      }
    },
  },
];
