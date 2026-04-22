export interface ParamDefinition {
  key: string;
  label: string;
  placeholder?: string;
}

export interface OperationDefinition {
  id: string;
  name: string;
  description: string;
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
    name: "Sort Alphabetically (A→Z)",
    description: "Sort lines A→Z (case-insensitive)",
    apply: (lines) =>
      [...lines].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
  },
  {
    id: "sort-alpha-desc",
    name: "Sort Alphabetically (Z→A)",
    description: "Sort lines Z→A (case-insensitive)",
    apply: (lines) =>
      [...lines].sort((a, b) => b.localeCompare(a, undefined, { sensitivity: "base" })),
  },
  {
    id: "sort-numeric",
    name: "Sort Numerically (Ascending)",
    description: "Sort lines by numeric value, ascending",
    apply: (lines) => [...lines].sort((a, b) => Number.parseFloat(a) - Number.parseFloat(b)),
  },
  {
    id: "sort-numeric-desc",
    name: "Sort Numerically (Descending)",
    description: "Sort lines by numeric value, descending",
    apply: (lines) => [...lines].sort((a, b) => Number.parseFloat(b) - Number.parseFloat(a)),
  },
  {
    id: "reverse-order",
    name: "Reverse Order",
    description: "Reverse the order of lines",
    apply: (lines) => [...lines].reverse(),
  },
  // --- Filtering ---
  {
    id: "remove-duplicates",
    name: "Remove Duplicate Lines",
    description: "Keep only the first occurrence of each line",
    apply: (lines) => [...new Set(lines)],
  },
  {
    id: "remove-empty",
    name: "Remove Empty Lines",
    description: "Remove blank and whitespace-only lines",
    apply: (lines) => lines.filter((line) => line.trim() !== ""),
  },
  {
    id: "remove-containing",
    name: "Remove Lines Containing",
    description: "Remove lines that contain the specified text",
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
    apply: (lines) => lines.map((line) => line.trim()),
  },
  // --- Case ---
  {
    id: "uppercase",
    name: "Uppercase",
    description: "Convert each line to UPPERCASE",
    apply: (lines) => lines.map((line) => line.toUpperCase()),
  },
  {
    id: "lowercase",
    name: "Lowercase",
    description: "Convert each line to lowercase",
    apply: (lines) => lines.map((line) => line.toLowerCase()),
  },
  // --- Transformation ---
  {
    id: "add-prefix",
    name: "Add Prefix",
    description: "Prepend text to the start of each line",
    params: [{ key: "prefix", label: "Prefix", placeholder: "e.g. - " }],
    apply: (lines, params) => lines.map((line) => `${params.prefix ?? ""}${line}`),
  },
  {
    id: "add-suffix",
    name: "Add Suffix",
    description: "Append text to the end of each line",
    params: [{ key: "suffix", label: "Suffix", placeholder: "e.g. ," }],
    apply: (lines, params) => lines.map((line) => `${line}${params.suffix ?? ""}`),
  },
  {
    id: "find-replace",
    name: "Find and Replace",
    description: "Replace all occurrences of a string in each line",
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
