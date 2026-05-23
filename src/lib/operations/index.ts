/**
 * Operations registry for Glyph Weaver.
 *
 * Text-processing operations are organised into category files and assembled
 * here into the flat `OPERATIONS` array consumed by the pipeline engine and
 * the UI palette. Import from this module rather than individual category
 * files so callers stay decoupled from the internal file structure.
 *
 * @module operations
 */

export type { OperationCategory, ParamDefinition, OperationDefinition } from "./types";

import type { OperationCategory } from "./types";
import { sortingOps } from "./sortingOps";
import { filteringOps } from "./filteringOps";
import { caseOps } from "./caseOps";
import { editOps } from "./editOps";
import { formatOps } from "./formatOps";
import { fixedWidthOps } from "./fixedWidthOps";
import { customOps } from "./customOps";
import { setOps } from "./setOps";

/** Complete ordered registry of all available text-processing operations. */
export const OPERATIONS = [
  ...sortingOps,
  ...filteringOps,
  ...caseOps,
  ...editOps,
  ...formatOps,
  ...fixedWidthOps,
  ...customOps,
  ...setOps,
];

/** O(1) lookup map for operations by ID. Use instead of `OPERATIONS.find`. */
export const OPERATIONS_BY_ID = new Map(OPERATIONS.map((op) => [op.id, op]));

/**
 * Display order for the Operations panel sidebar.
 * Custom is listed first so user-defined operations are always reachable
 * without scrolling.
 */
export const OPERATION_CATEGORIES: OperationCategory[] = [
  "Sorting",
  "Filtering",
  "Edit",
  "Format",
  "Fixed Width",
  "Set",
  "Case",
  "Custom",
];
