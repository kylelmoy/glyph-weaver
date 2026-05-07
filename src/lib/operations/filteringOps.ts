/**
 * Filtering operations — remove or retain lines based on content criteria.
 * Regex-based operations return lines unchanged on an invalid pattern.
 */

import type { OperationDefinition } from "./types";

export const filteringOps: OperationDefinition[] = [
  {
    id: "remove-duplicates",
    name: "Remove Duplicates",
    description: "Keep only the first occurrence of each line",
    category: "Filtering",
    apply: (lines) => [...new Set(lines)],
  },
  {
    id: "remove-empty",
    name: "Remove Empty",
    description: "Remove blank and whitespace-only lines",
    category: "Filtering",
    apply: (lines) => lines.filter((line) => line.trim() !== ""),
  },
  {
    id: "remove-containing",
    name: "Remove Containing",
    description: "Remove lines that contain the specified text",
    category: "Filtering",
    params: [{ key: "query", label: "Text to match", placeholder: "e.g. foo" }],
    apply: (lines, params) => {
      const query = params.query ?? "";
      if (!query) return lines;
      return lines.filter((line) => !line.includes(query));
    },
  },
  {
    id: "keep-containing",
    name: "Keep Containing",
    description: "Keep only lines that contain the specified text",
    category: "Filtering",
    params: [{ key: "query", label: "Text to match", placeholder: "e.g. foo" }],
    apply: (lines, params) => {
      const query = params.query ?? "";
      if (!query) return lines;
      return lines.filter((line) => line.includes(query));
    },
  },
  {
    id: "keep-regex",
    name: "Keep Matching Regex",
    description: "Keep only lines that match a regular expression",
    category: "Filtering",
    params: [
      { key: "pattern", label: "Regex pattern", placeholder: "e.g. ^\\d+$", monospace: true },
    ],
    apply: (lines, params) => {
      const pattern = params.pattern ?? "";
      if (!pattern) return lines;
      try {
        const re = new RegExp(pattern);
        return lines.filter((line) => re.test(line));
      } catch {
        return lines; // invalid regex — pass through unchanged
      }
    },
  },
  {
    id: "remove-regex",
    name: "Remove Matching Regex",
    description: "Remove lines that match a regular expression",
    category: "Filtering",
    params: [
      { key: "pattern", label: "Regex pattern", placeholder: "e.g. ^\\s*#", monospace: true },
    ],
    apply: (lines, params) => {
      const pattern = params.pattern ?? "";
      if (!pattern) return lines;
      try {
        const re = new RegExp(pattern);
        return lines.filter((line) => !re.test(line));
      } catch {
        return lines; // invalid regex — pass through unchanged
      }
    },
  },
  {
    id: "keep-first-n",
    name: "Keep First N Lines",
    description: "Keep only the first N lines",
    category: "Filtering",
    params: [{ key: "count", label: "Number of lines", placeholder: "e.g. 10" }],
    apply: (lines, params) => {
      const n = Math.max(0, Number.parseInt(params.count ?? "") || 10);
      return lines.slice(0, n);
    },
  },
  {
    id: "keep-last-n",
    name: "Keep Last N Lines",
    description: "Keep only the last N lines",
    category: "Filtering",
    params: [{ key: "count", label: "Number of lines", placeholder: "e.g. 10" }],
    apply: (lines, params) => {
      const n = Math.max(0, Number.parseInt(params.count ?? "") || 10);
      return lines.slice(-n);
    },
  },
];
