/**
 * JSON operations — convert, format, and parse JSON.
 * All operations return lines unchanged on a parse failure.
 */

import type { OperationDefinition } from "./types";

export const jsonOps: OperationDefinition[] = [
  {
    id: "lines-to-json-array",
    name: "Lines → JSON Array",
    description: "Wrap all lines as a JSON string array",
    category: "JSON",
    apply: (lines) => [JSON.stringify(lines)],
  },
  {
    id: "json-array-to-lines",
    name: "JSON Array → Lines",
    description: "Expand a JSON array into one item per line",
    category: "JSON",
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
    category: "JSON",
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
    category: "JSON",
    apply: (lines) => {
      try {
        return [JSON.stringify(JSON.parse(lines.join("\n")))];
      } catch {
        return lines; // invalid JSON — pass through unchanged
      }
    },
  },
];
