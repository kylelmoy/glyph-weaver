/**
 * Sorting operations — reorder lines without modifying their content.
 */

import type { OperationDefinition } from "./types";

export const sortingOps: OperationDefinition[] = [
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
      // Fisher-Yates: iterate from the end and swap each element with a
      // randomly chosen earlier index, producing a uniform random permutation.
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
  },
];
