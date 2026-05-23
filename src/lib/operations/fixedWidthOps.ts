/**
 * Fixed-width operations — slice, pad, and reshape text where fields occupy
 * predictable character positions (e.g. COBOL records, legacy flat files).
 *
 * All positions are 1-indexed (first character = position 1).
 * Operations return lines unchanged when a required parameter is missing or
 * produces a width/position of 0.
 */

import type { OperationDefinition } from "./types";

export const fixedWidthOps: OperationDefinition[] = [
  {
    id: "fw-truncate-before",
    name: "Truncate Before",
    description:
      "Drop every character before position X — keep from position X to the end (1-indexed)",
    category: "Fixed Width",
    params: [{ key: "position", label: "Position (1-indexed)", placeholder: "e.g. 10" }],
    apply: (lines, params) => {
      const pos = Number.parseInt(params.position ?? "");
      if (Number.isNaN(pos) || pos < 1) return lines;
      return lines.map((line) => line.slice(pos - 1));
    },
  },
  {
    id: "fw-truncate-after",
    name: "Truncate After",
    description:
      "Drop every character after position X — keep from the start through position X (1-indexed, inclusive)",
    category: "Fixed Width",
    params: [{ key: "position", label: "Position (1-indexed)", placeholder: "e.g. 10" }],
    apply: (lines, params) => {
      const pos = Number.parseInt(params.position ?? "");
      if (Number.isNaN(pos) || pos < 1) return lines;
      return lines.map((line) => line.slice(0, pos));
    },
  },
  {
    id: "fw-slice",
    name: "Slice Columns",
    description:
      "Extract characters from Start through End (1-indexed, both ends inclusive). Useful for ad-hoc column ranges.",
    category: "Fixed Width",
    params: [
      { key: "start", label: "Start position (1-indexed)", placeholder: "1" },
      { key: "end", label: "End position (1-indexed, inclusive)", placeholder: "10" },
    ],
    apply: (lines, params) => {
      const start = Number.parseInt(params.start ?? "");
      const end = Number.parseInt(params.end ?? "");
      if (Number.isNaN(start) || Number.isNaN(end) || start < 1 || end < start) return lines;
      return lines.map((line) => line.slice(start - 1, end));
    },
  },
  {
    id: "fw-extract-field",
    name: "Extract Field",
    description:
      "Extract a fixed-width field starting at position Start with a given Length (1-indexed). Ideal for reading named fields from a record layout.",
    category: "Fixed Width",
    params: [
      { key: "start", label: "Start position (1-indexed)", placeholder: "1" },
      { key: "length", label: "Field length", placeholder: "10" },
    ],
    apply: (lines, params) => {
      const start = Number.parseInt(params.start ?? "");
      const length = Number.parseInt(params.length ?? "");
      if (Number.isNaN(start) || Number.isNaN(length) || start < 1 || length < 1) return lines;
      return lines.map((line) => line.slice(start - 1, start - 1 + length));
    },
  },
  {
    id: "fw-pad-right",
    name: "Pad / Truncate Right",
    description:
      "Right-pad each line with a fill character to exactly N characters; truncate lines that are already longer. Standard for left-aligned fixed-width fields.",
    category: "Fixed Width",
    params: [
      { key: "width", label: "Width", placeholder: "20" },
      { key: "fill", label: "Fill character", placeholder: " " },
    ],
    apply: (lines, params) => {
      const width = Number.parseInt(params.width ?? "");
      if (Number.isNaN(width) || width < 1) return lines;
      const fill =
        params.fill !== undefined && params.fill !== "" ? params.fill[0] : " ";
      return lines.map((line) =>
        line.length >= width ? line.slice(0, width) : line + fill.repeat(width - line.length),
      );
    },
  },
  {
    id: "fw-pad-left",
    name: "Pad / Truncate Left",
    description:
      "Left-pad each line with a fill character to exactly N characters; truncate lines that are already longer. Standard for right-aligned and zero-padded numeric fields.",
    category: "Fixed Width",
    params: [
      { key: "width", label: "Width", placeholder: "20" },
      { key: "fill", label: "Fill character", placeholder: " " },
    ],
    apply: (lines, params) => {
      const width = Number.parseInt(params.width ?? "");
      if (Number.isNaN(width) || width < 1) return lines;
      const fill =
        params.fill !== undefined && params.fill !== "" ? params.fill[0] : " ";
      return lines.map((line) =>
        line.length >= width ? line.slice(0, width) : fill.repeat(width - line.length) + line,
      );
    },
  },
  {
    id: "fw-insert-at",
    name: "Insert at Position",
    description:
      "Insert text at a specific character position in each line without removing any existing characters (1-indexed). Handy for injecting delimiters or field markers into flat records.",
    category: "Fixed Width",
    params: [
      { key: "position", label: "Position (1-indexed)", placeholder: "e.g. 5" },
      { key: "text", label: "Text to insert", placeholder: "e.g. |" },
    ],
    apply: (lines, params) => {
      const pos = Number.parseInt(params.position ?? "");
      if (Number.isNaN(pos) || pos < 1) return lines;
      const text = params.text ?? "";
      return lines.map((line) => line.slice(0, pos - 1) + text + line.slice(pos - 1));
    },
  },
];
