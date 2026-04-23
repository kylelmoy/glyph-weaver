/** The five groupings shown in the Operations panel. */
export type OperationCategory = "Sorting" | "Filtering" | "Whitespace" | "Case" | "Transformation";

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
  // --- Whitespace ---
  {
    id: "trim-whitespace",
    name: "Trim Whitespace",
    description: "Remove leading and trailing whitespace from each line",
    category: "Whitespace",
    apply: (lines) => lines.map((line) => line.trim()),
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
    id: "custom-js",
    name: "Custom Expression",
    description: "Transform each line with a JS expression — variable `line` holds the current line",
    category: "Transformation",
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
];

/** Display order for the Operations panel sidebar. */
export const OPERATION_CATEGORIES: OperationCategory[] = [
  "Sorting",
  "Filtering",
  "Whitespace",
  "Case",
  "Transformation",
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
