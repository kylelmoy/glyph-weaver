/**
 * Case operations — transform the capitalisation of line content.
 * Word-boundary splitting uses spaces, hyphens, and underscores.
 */

import type { OperationDefinition } from "./types";

export const caseOps: OperationDefinition[] = [
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
      lines.map((line) => line.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())),
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
        line
          .trim()
          .toLowerCase()
          .replace(/[\s\-]+/g, "_"),
      ),
  },
  {
    id: "kebab-case",
    name: "kebab-case",
    description: "Convert to kebab-case — replaces spaces and underscores with hyphens",
    category: "Case",
    apply: (lines) =>
      lines.map((line) =>
        line
          .trim()
          .toLowerCase()
          .replace(/[\s_]+/g, "-"),
      ),
  },
];
