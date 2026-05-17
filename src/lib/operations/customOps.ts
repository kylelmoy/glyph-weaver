/**
 * Custom operations — user-defined transformations via JavaScript expressions.
 *
 * Security note: `new Function` executes code written by the user in the
 * browser's JS engine. This is intentional — the expression runs in the same
 * origin as the page with no elevated permissions, and only ever processes
 * data the user has already loaded into the tool. Never pipe untrusted
 * third-party content into this operation without understanding the implications.
 */

import type { OperationDefinition } from "./types";

export const customOps: OperationDefinition[] = [
  {
    id: "custom-js",
    name: "Custom Expression",
    description:
      "Transform each line with a JS expression — variable `line` holds the current line",
    category: "Custom",
    params: [
      {
        key: "code",
        label: "Expression (use `line`)",
        placeholder: "e.g. line.split(',').reverse().join(',')",
        monospace: true,
        raw: true,
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
            return line; // expression threw for this line — pass through unchanged
          }
        });
      } catch {
        return lines; // expression failed to compile — pass through unchanged
      }
    },
  },
];
