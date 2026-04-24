/** The five groupings shown in the Operations panel. */
export type OperationCategory = "Sorting" | "Filtering" | "Whitespace" | "Case" | "Transformation" | "Format" | "Custom";

/** A single configurable input accepted by an operation. */
export interface ParamDefinition {
  /** State key used to read/write the value in `PipelineItem.params`. */
  key: string;
  /** Human-readable label shown above the input field. */
  label: string;
  placeholder?: string;
  /** When true, the input renders in a monospace font (useful for code expressions). */
  monospace?: boolean;
}

/** Blueprint for a text-processing operation — one entry in the OPERATIONS registry. */
export interface OperationDefinition {
  id: string;
  name: string;
  /** Short description shown as a tooltip or help text. */
  description: string;
  category: OperationCategory;
  /** Optional list of user-configurable inputs. Omit for parameter-free operations. */
  params?: ParamDefinition[];
  /** Pure function: receives the current line array and returns a transformed array. */
  apply: (lines: string[], params: Record<string, string>) => string[];
}

/** A single operation instance placed in the active pipeline. */
export interface PipelineItem {
  /** Unique ID scoped to the current session — used as a React key and for targeting updates. */
  instanceId: string;
  /** References an `OperationDefinition.id` in the OPERATIONS registry. */
  operationId: string;
  /** Maps each `ParamDefinition.key` to the user-supplied value. */
  params: Record<string, string>;
}

/** A pipeline snapshot persisted to localStorage. */
export interface SavedPipeline {
  /** Unique ID generated at save time (Date.now() string). */
  id: string;
  name: string;
  /** Unix timestamp (ms) of when the pipeline was saved. */
  savedAt: number;
  pipeline: PipelineItem[];
}

/** Complete registry of available text operations, ordered within each category. */
export const OPERATIONS: OperationDefinition[] = [
  // --- Sorting ---
  {
    id: "sort-alpha",
    name: "Sort A→Z",
    description: "Sort lines alphabetically, A→Z (case-insensitive)",
    category: "Sorting",
    apply: (lines) =>
      [...lines].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
  },
  {
    id: "sort-alpha-desc",
    name: "Sort Z→A",
    description: "Sort lines alphabetically, Z→A (case-insensitive)",
    category: "Sorting",
    apply: (lines) =>
      [...lines].sort((a, b) => b.localeCompare(a, undefined, { sensitivity: "base" })),
  },
  {
    id: "sort-numeric",
    name: "Sort Numerically ↑",
    description: "Sort lines by numeric value, ascending",
    category: "Sorting",
    apply: (lines) => [...lines].sort((a, b) => Number.parseFloat(a) - Number.parseFloat(b)),
  },
  {
    id: "sort-numeric-desc",
    name: "Sort Numerically ↓",
    description: "Sort lines by numeric value, descending",
    category: "Sorting",
    apply: (lines) => [...lines].sort((a, b) => Number.parseFloat(b) - Number.parseFloat(a)),
  },
  {
    id: "reverse-order",
    name: "Reverse Order",
    description: "Reverse the order of lines",
    category: "Sorting",
    apply: (lines) => [...lines].reverse(),
  },
  {
    id: "sort-length-asc",
    name: "Sort by Length ↑",
    description: "Sort lines shortest to longest",
    category: "Sorting",
    apply: (lines) => [...lines].sort((a, b) => a.length - b.length),
  },
  {
    id: "sort-length-desc",
    name: "Sort by Length ↓",
    description: "Sort lines longest to shortest",
    category: "Sorting",
    apply: (lines) => [...lines].sort((a, b) => b.length - a.length),
  },
  {
    id: "shuffle",
    name: "Shuffle",
    description: "Randomize the order of lines (Fisher-Yates)",
    category: "Sorting",
    apply: (lines) => {
      const arr = [...lines];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
  },
  // --- Filtering ---
  {
    id: "remove-duplicates",
    name: "Remove Duplicates",
    description: "Keep only the first occurrence of each line",
    category: "Filtering",
    apply: (lines) => [...new Set(lines)],
  },
  {
    id: "remove-empty",
    name: "Remove Empty Lines",
    description: "Remove blank and whitespace-only lines",
    category: "Filtering",
    apply: (lines) => lines.filter((line) => line.trim() !== ""),
  },
  {
    id: "remove-containing",
    name: "Remove Lines Containing",
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
    name: "Keep Lines Containing",
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
    name: "Keep Lines Matching Regex",
    description: "Keep only lines that match a regular expression",
    category: "Filtering",
    params: [{ key: "pattern", label: "Regex pattern", placeholder: "e.g. ^\\d+$", monospace: true }],
    apply: (lines, params) => {
      const pattern = params.pattern ?? "";
      if (!pattern) return lines;
      try {
        const re = new RegExp(pattern);
        return lines.filter((line) => re.test(line));
      } catch {
        return lines;
      }
    },
  },
  {
    id: "remove-regex",
    name: "Remove Lines Matching Regex",
    description: "Remove lines that match a regular expression",
    category: "Filtering",
    params: [{ key: "pattern", label: "Regex pattern", placeholder: "e.g. ^\\s*#", monospace: true }],
    apply: (lines, params) => {
      const pattern = params.pattern ?? "";
      if (!pattern) return lines;
      try {
        const re = new RegExp(pattern);
        return lines.filter((line) => !re.test(line));
      } catch {
        return lines;
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
  {
    id: "extract-regex",
    name: "Extract Regex Match",
    description: "Replace each line with its first regex match; lines with no match are removed",
    category: "Filtering",
    params: [{ key: "pattern", label: "Regex pattern", placeholder: "e.g. \\d+", monospace: true }],
    apply: (lines, params) => {
      const pattern = params.pattern ?? "";
      if (!pattern) return lines;
      try {
        const re = new RegExp(pattern);
        return lines.flatMap((line) => {
          const m = line.match(re);
          if (!m) return [];
          return [m[1] !== undefined ? m[1] : m[0]];
        });
      } catch {
        return lines;
      }
    },
  },
  // --- Whitespace ---
  {
    id: "trim-whitespace",
    name: "Trim Whitespace",
    description: "Remove leading and trailing whitespace from each line",
    category: "Whitespace",
    apply: (lines) => lines.map((line) => line.trim()),
  },
  {
    id: "collapse-whitespace",
    name: "Collapse Whitespace",
    description: "Replace runs of whitespace with a single space and trim each line",
    category: "Whitespace",
    apply: (lines) => lines.map((line) => line.replace(/\s+/g, " ").trim()),
  },
  // --- Case ---
  {
    id: "uppercase",
    name: "Uppercase",
    description: "Convert each line to UPPERCASE",
    category: "Case",
    apply: (lines) => lines.map((line) => line.toUpperCase()),
  },
  {
    id: "lowercase",
    name: "Lowercase",
    description: "Convert each line to lowercase",
    category: "Case",
    apply: (lines) => lines.map((line) => line.toLowerCase()),
  },
  {
    id: "title-case",
    name: "Title Case",
    description: "Capitalize the first letter of every word",
    category: "Case",
    apply: (lines) =>
      lines.map((line) =>
        line.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
      ),
  },
  {
    id: "camel-case",
    name: "camelCase",
    description: "Convert to camelCase — splits on spaces, hyphens, and underscores",
    category: "Case",
    apply: (lines) =>
      lines.map((line) =>
        line
          .trim()
          .toLowerCase()
          .split(/[\s\-_]+/)
          .filter(Boolean)
          .map((word, i) => (i === 0 ? word : word[0].toUpperCase() + word.slice(1)))
          .join(""),
      ),
  },
  {
    id: "snake-case",
    name: "snake_case",
    description: "Convert to snake_case — replaces spaces and hyphens with underscores",
    category: "Case",
    apply: (lines) =>
      lines.map((line) =>
        line.trim().toLowerCase().replace(/[\s\-]+/g, "_"),
      ),
  },
  {
    id: "kebab-case",
    name: "kebab-case",
    description: "Convert to kebab-case — replaces spaces and underscores with hyphens",
    category: "Case",
    apply: (lines) =>
      lines.map((line) =>
        line.trim().toLowerCase().replace(/[\s_]+/g, "-"),
      ),
  },
  // --- Transformation ---
  {
    id: "add-prefix",
    name: "Add Prefix",
    description: "Prepend text to the start of each line",
    category: "Transformation",
    params: [{ key: "prefix", label: "Prefix", placeholder: "e.g. - " }],
    apply: (lines, params) => lines.map((line) => `${params.prefix ?? ""}${line}`),
  },
  {
    id: "add-suffix",
    name: "Add Suffix",
    description: "Append text to the end of each line",
    category: "Transformation",
    params: [{ key: "suffix", label: "Suffix", placeholder: "e.g. ," }],
    apply: (lines, params) => lines.map((line) => `${line}${params.suffix ?? ""}`),
  },
  {
    id: "find-replace",
    name: "Find and Replace",
    description: "Replace all occurrences of a string in each line",
    category: "Transformation",
    params: [
      { key: "find", label: "Find", placeholder: "Text to find" },
      { key: "replace", label: "Replace with", placeholder: "Replacement text" },
    ],
    apply: (lines, params) => {
      const find = params.find ?? "";
      if (!find) return lines;
      return lines.map((line) => line.split(find).join(params.replace ?? ""));
    },
  },
  {
    id: "regex-replace",
    name: "Regex Find & Replace",
    description: "Replace regex matches in each line; use $1, $2 for capture groups",
    category: "Transformation",
    params: [
      { key: "pattern", label: "Regex pattern", placeholder: "e.g. (\\w+)@(\\w+)", monospace: true },
      { key: "replace", label: "Replacement (use $1, $2…)", placeholder: "e.g. $2/$1", monospace: true },
      { key: "flags", label: "Flags", placeholder: "g" },
    ],
    apply: (lines, params) => {
      const pattern = params.pattern ?? "";
      if (!pattern) return lines;
      const flags = /^[gimsuy]*$/.test(params.flags ?? "") ? (params.flags ?? "g") : "g";
      try {
        const re = new RegExp(pattern, flags);
        return lines.map((line) => line.replace(re, params.replace ?? ""));
      } catch {
        return lines;
      }
    },
  },
  {
    id: "number-lines",
    name: "Number Lines",
    description: "Prepend a sequential number to each line",
    category: "Transformation",
    params: [
      { key: "start", label: "Starting number", placeholder: "1" },
      { key: "separator", label: "Separator", placeholder: ". " },
    ],
    apply: (lines, params) => {
      const start = Number.parseInt(params.start ?? "") || 1;
      const sep = params.separator !== undefined ? params.separator : ". ";
      return lines.map((line, i) => `${start + i}${sep}${line}`);
    },
  },
  {
    id: "wrap-quotes",
    name: "Wrap in Quotes",
    description: "Surround each line with quote characters",
    category: "Transformation",
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
    category: "Transformation",
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
    category: "Transformation",
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
    category: "Transformation",
    apply: (lines) => lines.map((line) => encodeURIComponent(line)),
  },
  {
    id: "url-decode",
    name: "URL Decode",
    description: "Decode percent-encoded characters in each line",
    category: "Transformation",
    apply: (lines) =>
      lines.map((line) => {
        try {
          return decodeURIComponent(line);
        } catch {
          return line;
        }
      }),
  },
  {
    id: "base64-encode",
    name: "Base64 Encode",
    description: "Encode each line as Base64 (UTF-8 safe)",
    category: "Transformation",
    apply: (lines) =>
      lines.map((line) => {
        const bytes = new TextEncoder().encode(line);
        return btoa(Array.from(bytes, (b) => String.fromCodePoint(b)).join(""));
      }),
  },
  {
    id: "base64-decode",
    name: "Base64 Decode",
    description: "Decode Base64-encoded content in each line",
    category: "Transformation",
    apply: (lines) =>
      lines.map((line) => {
        try {
          const binStr = atob(line.trim());
          const bytes = Uint8Array.from(binStr, (c) => c.codePointAt(0)!);
          return new TextDecoder().decode(bytes);
        } catch {
          return line;
        }
      }),
  },
  {
    id: "custom-js",
    name: "Custom Expression",
    description: "Transform each line with a JS expression — variable `line` holds the current line",
    category: "Custom",
    params: [
      {
        key: "code",
        label: "Expression (use `line`)",
        placeholder: "e.g. line.split(',').reverse().join(',')",
        monospace: true,
      },
    ],
    apply: (lines, params) => {
      const code = params.code?.trim() ?? "";
      if (!code) return lines;
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function("line", `return (${code})`);
        return lines.map((line) => {
          try {
            const result = fn(line) as unknown;
            return result == null ? "" : String(result);
          } catch {
            return line;
          }
        });
      } catch {
        return lines;
      }
    },
  },
  // --- Format ---
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
        const cells: string[] = [];
        let cur = "";
        let inQuote = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (inQuote) {
            if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
            else if (ch === '"') { inQuote = false; }
            else { cur += ch; }
          } else {
            if (ch === '"') { inQuote = true; }
            else if (ch === ",") { cells.push(cur); cur = ""; }
            else { cur += ch; }
          }
        }
        cells.push(cur);
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
          return parsed.map((item) =>
            typeof item === "string" ? item : JSON.stringify(item),
          );
        }
      } catch { /* fall through */ }
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
        return lines;
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
        return lines;
      }
    },
  },
];

/** Display order for the Operations panel sidebar. */
export const OPERATION_CATEGORIES: OperationCategory[] = [
  "Custom",
  "Sorting",
  "Filtering",
  "Whitespace",
  "Case",
  "Transformation",
  "Format",
];

/**
 * Run the input string through every operation in the pipeline sequentially.
 * Each operation receives the output of the previous one as its input.
 * Returns an empty string when input is empty or the pipeline is empty.
 */
export function processText(input: string, pipeline: PipelineItem[]): string {
  if (!input) return "";
  const lines = input.split("\n");
  return pipeline
    .reduce((acc, item) => {
      const op = OPERATIONS.find((o) => o.id === item.operationId);
      return op ? op.apply(acc, item.params) : acc;
    }, lines)
    .join("\n");
}
