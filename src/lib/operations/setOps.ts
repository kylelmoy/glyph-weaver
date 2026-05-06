import type { OperationDefinition } from "./types";

export const setOps: OperationDefinition[] = [
  {
    id: "set-union",
    name: "Union",
    description: "Merge lines from both inputs, removing duplicates (A ∪ B)",
    category: "Set",
    multiInput: true,
    apply: (lines) => lines,
    applyMulti: ([a = [], b = []]) => {
      const seen = new Set<string>();
      const result: string[] = [];
      for (const line of [...a, ...b]) {
        if (!seen.has(line)) {
          seen.add(line);
          result.push(line);
        }
      }
      return result;
    },
  },
  {
    id: "set-intersection",
    name: "Intersection",
    description: "Keep only lines present in both inputs (A ∩ B)",
    category: "Set",
    multiInput: true,
    apply: (lines) => lines,
    applyMulti: ([a = [], b = []]) => {
      const bSet = new Set(b);
      return a.filter((line) => bSet.has(line));
    },
  },
  {
    id: "set-difference",
    name: "Difference",
    description: "Keep lines from A that are not in B (A − B)",
    category: "Set",
    multiInput: true,
    apply: (lines) => lines,
    applyMulti: ([a = [], b = []]) => {
      const bSet = new Set(b);
      return a.filter((line) => !bSet.has(line));
    },
  },
  {
    id: "set-sym-difference",
    name: "Sym. Difference",
    description: "Keep lines present in exactly one of the two inputs (A △ B)",
    category: "Set",
    multiInput: true,
    apply: (lines) => lines,
    applyMulti: ([a = [], b = []]) => {
      const aSet = new Set(a);
      const bSet = new Set(b);
      return [...a.filter((line) => !bSet.has(line)), ...b.filter((line) => !aSet.has(line))];
    },
  },
];
