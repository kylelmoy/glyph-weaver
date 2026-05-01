/** The six groupings shown in the Operations panel. */
export type OperationCategory = "Sorting" | "Filtering" | "Case" | "Edit" | "Format" | "Custom";

/** A single configurable input field displayed on an operation node. */
export interface ParamDefinition {
  /** State key used to read/write the value in `PipelineNode.params`. */
  key: string;
  /** Human-readable label rendered above the input field. */
  label: string;
  /** Ghost text shown when the field is empty. */
  placeholder?: string;
  /** When true, the input renders in a monospace font (useful for code or regex). */
  monospace?: boolean;
}

/**
 * Blueprint for a single text-processing operation.
 * Each entry in the OPERATIONS registry must conform to this interface.
 */
export interface OperationDefinition {
  /** Stable identifier — used as the key in saved pipelines. Do not change after release. */
  id: string;
  /** Display name shown in the operations palette and on the canvas node. */
  name: string;
  /** Short description shown as a tooltip in the palette. */
  description: string;
  category: OperationCategory;
  /** User-configurable inputs. Omit for parameter-free operations. */
  params?: ParamDefinition[];
  /**
   * Pure transformation function.
   *
   * Receives the current array of lines and a map of parameter values, and
   * returns the transformed array. Must never throw — on error (e.g. invalid
   * regex or malformed input), return `lines` unchanged.
   */
  apply: (lines: string[], params: Record<string, string>) => string[];
}
