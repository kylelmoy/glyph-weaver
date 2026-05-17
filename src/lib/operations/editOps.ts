/**
 * Edit operations — in-place transformations of line content.
 * Covers text manipulation, encoding/decoding, numbering, and
 * joining/splitting lines.
 *
 * Regex-based operations return lines unchanged on an invalid pattern.
 * Encoding operations return the original line on decode failure.
 */

import type { OperationDefinition } from "./types";

export const editOps: OperationDefinition[] = [
  {
    id: "trim-whitespace",
    name: "Trim Whitespace",
    description: "Remove leading and trailing whitespace from each line",
    category: "Edit",
    apply: (lines) => lines.map((line) => line.trim()),
  },
  {
    id: "collapse-whitespace",
    name: "Collapse Whitespace",
    description: "Replace runs of whitespace with a single space and trim each line",
    category: "Edit",
    apply: (lines) => lines.map((line) => line.replace(/\s+/g, " ").trim()),
  },
  {
    id: "add-prefix",
    name: "Add Prefix",
    description: "Prepend text to the start of each line",
    category: "Edit",
    params: [{ key: "prefix", label: "Prefix", placeholder: "e.g. - " }],
    apply: (lines, params) => lines.map((line) => `${params.prefix ?? ""}${line}`),
  },
  {
    id: "add-suffix",
    name: "Add Suffix",
    description: "Append text to the end of each line",
    category: "Edit",
    params: [{ key: "suffix", label: "Suffix", placeholder: "e.g. ," }],
    apply: (lines, params) => lines.map((line) => `${line}${params.suffix ?? ""}`),
  },
  {
    id: "find-replace",
    name: "Find and Replace",
    description: "Replace all occurrences of a string in each line",
    category: "Edit",
    params: [
      { key: "find", label: "Find", placeholder: "Text to find" },
      { key: "replace", label: "Replace with", placeholder: "Replacement text" },
    ],
    apply: (lines, params) => {
      const find = params.find ?? "";
      if (!find) return lines;
      // String.split+join is used instead of replace() to avoid special-character
      // interpretation in the "find" string (e.g. $ signs).
      return lines.map((line) => line.split(find).join(params.replace ?? ""));
    },
  },
  {
    id: "regex-replace",
    name: "Regex Find & Replace",
    description: "Replace regex matches in each line; use $1, $2 for capture groups",
    category: "Edit",
    params: [
      {
        key: "pattern",
        label: "Regex pattern",
        placeholder: "e.g. (\\w+)@(\\w+)",
        monospace: true,
        raw: true,
      },
      {
        key: "replace",
        label: "Replacement (use $1, $2…)",
        placeholder: "e.g. $2/$1",
        monospace: true,
      },
      { key: "flags", label: "Flags", placeholder: "g" },
    ],
    apply: (lines, params) => {
      const pattern = params.pattern ?? "";
      if (!pattern) return lines;
      // Only allow known regex flags to prevent a runtime RangeError on invalid flags.
      const flags = /^[gimsuy]*$/.test(params.flags ?? "") ? (params.flags ?? "g") : "g";
      try {
        const re = new RegExp(pattern, flags);
        return lines.map((line) => line.replace(re, params.replace ?? ""));
      } catch {
        return lines; // invalid regex — pass through unchanged
      }
    },
  },
  {
    id: "extract-regex",
    name: "Extract Regex Match",
    description: "Replace each line with its first regex match; lines with no match are removed",
    category: "Edit",
    params: [{ key: "pattern", label: "Regex pattern", placeholder: "e.g. \\d+", monospace: true, raw: true }],
    apply: (lines, params) => {
      const pattern = params.pattern ?? "";
      if (!pattern) return lines;
      try {
        const re = new RegExp(pattern);
        return lines.flatMap((line) => {
          const m = line.match(re);
          if (!m) return [];
          // Prefer capture group 1 if present; otherwise return the full match.
          return [m[1] !== undefined ? m[1] : m[0]];
        });
      } catch {
        return lines; // invalid regex — pass through unchanged
      }
    },
  },
  {
    id: "number-lines",
    name: "Number Lines",
    description: "Prepend a sequential number to each line",
    category: "Edit",
    params: [
      { key: "start", label: "Starting number", placeholder: "1" },
      { key: "separator", label: "Separator", placeholder: ". " },
    ],
    apply: (lines, params) => {
      const start = Number.parseInt(params.start ?? "") || 1;
      const sep = params.separator || ". ";
      return lines.map((line, i) => `${start + i}${sep}${line}`);
    },
  },
  {
    id: "wrap-quotes",
    name: "Wrap in Quotes",
    description: "Surround each line with quote characters",
    category: "Edit",
    params: [{ key: "quote", label: "Quote character", placeholder: '"' }],
    apply: (lines, params) => {
      const q = params.quote !== undefined && params.quote !== "" ? params.quote : '"';
      return lines.map((line) => `${q}${line}${q}`);
    },
  },
  {
    id: "join-lines",
    name: "Join Lines",
    description: "Combine all lines into a single line with a separator",
    category: "Edit",
    params: [{ key: "separator", label: "Separator", placeholder: ", " }],
    apply: (lines, params) => {
      const sep = params.separator !== undefined ? params.separator : ", ";
      return [lines.join(sep)];
    },
  },
  {
    id: "split-by-delimiter",
    name: "Split by Delimiter",
    description: "Split each line into multiple lines on a delimiter",
    category: "Edit",
    params: [{ key: "delimiter", label: "Delimiter", placeholder: "," }],
    apply: (lines, params) => {
      const delim = params.delimiter ?? "";
      if (!delim) return lines;
      return lines.flatMap((line) => line.split(delim));
    },
  },
  {
    id: "url-encode",
    name: "URL Encode",
    description: "Percent-encode each line for use in a URL",
    category: "Edit",
    apply: (lines) => lines.map((line) => encodeURIComponent(line)),
  },
  {
    id: "url-decode",
    name: "URL Decode",
    description: "Decode percent-encoded characters in each line",
    category: "Edit",
    apply: (lines) =>
      lines.map((line) => {
        try {
          return decodeURIComponent(line);
        } catch {
          return line; // malformed percent sequence — pass through unchanged
        }
      }),
  },
  {
    id: "base64-encode",
    name: "Base64 Encode",
    description: "Encode each line as Base64 (UTF-8 safe)",
    category: "Edit",
    apply: (lines) =>
      lines.map((line) => {
        // TextEncoder produces UTF-8 bytes; convert to a binary string so
        // btoa (which expects Latin-1) can encode multi-byte characters safely.
        const bytes = new TextEncoder().encode(line);
        return btoa(Array.from(bytes, (b) => String.fromCodePoint(b)).join(""));
      }),
  },
  {
    id: "base64-decode",
    name: "Base64 Decode",
    description: "Decode Base64-encoded content in each line",
    category: "Edit",
    apply: (lines) =>
      lines.map((line) => {
        try {
          const binStr = atob(line.trim());
          const bytes = Uint8Array.from(binStr, (c) => c.codePointAt(0)!);
          return new TextDecoder().decode(bytes);
        } catch {
          return line; // invalid base64 — pass through unchanged
        }
      }),
  },
];
