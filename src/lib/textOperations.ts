export type OperationCategory = "Sorting" | "Filtering" | "Whitespace" | "Case" | "Transformation";

export interface ParamDefinition {
  key: string;
  label: string;
  placeholder?: string;
  monospace?: boolean;
}

export interface OperationDefinition {
  id: string;
  name: string;
  description: string;
  category: OperationCategory;
  params?: ParamDefinition[];
  apply: (lines: string[], params: Record<string, string>) => string[];
}

export interface PipelineItem {
  instanceId: string;
  operationId: string;
  params: Record<string, string>;
}

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

export const OPERATION_CATEGORIES: OperationCategory[] = [
  "Sorting",
  "Filtering",
  "Whitespace",
  "Case",
  "Transformation",
];

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
