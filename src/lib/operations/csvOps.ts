/**
 * CSV operations — parse and convert comma-separated values.
 * Implements RFC 4180 quoting (quoted fields, escaped double-quotes).
 */

import type { OperationDefinition } from "./types";

export const csvOps: OperationDefinition[] = [
  {
    id: "csv-to-tsv",
    name: "CSV → TSV",
    description: "Convert comma-separated values to tab-separated values",
    category: "CSV",
    apply: (lines) =>
      lines.map((line) => {
        // RFC 4180 CSV requires a character-by-character state machine because
        // regex-based splitting cannot correctly handle quoted commas or escaped
        // double-quotes (represented as "" inside a quoted field).
        const cells: string[] = [];
        let cur = "";
        let inQuote = false;

        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (inQuote) {
            if (ch === '"' && line[i + 1] === '"') {
              cur += '"'; // escaped quote ("") → literal "
              i++; // skip the second "
            } else if (ch === '"') {
              inQuote = false; // closing quote ends the field
            } else {
              cur += ch;
            }
          } else {
            if (ch === '"') {
              inQuote = true; // opening quote starts a quoted field
            } else if (ch === ",") {
              cells.push(cur);
              cur = "";
            } else {
              cur += ch;
            }
          }
        }
        cells.push(cur); // flush the final cell
        return cells.join("\t");
      }),
  },
];
