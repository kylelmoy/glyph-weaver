/**
 * Pipeline graph — type definitions and DAG execution engine for Glyph Weaver.
 *
 * A pipeline is a directed acyclic graph (DAG) where:
 *  - Input nodes (`operationId === INPUT_NODE_ID`) are roots that provide text.
 *  - Operation nodes transform text received from their parent(s).
 *  - Set operation nodes accept two inputs via handles "a" and "b".
 *  - Output/tap nodes are passthroughs that always appear in the output panel.
 *  - Leaf nodes (no outgoing edges) also produce visible outputs.
 *
 * @module pipelineGraph
 */

import { OPERATIONS_BY_ID } from "./operations";

// ── Sentinel IDs ──────────────────────────────────────────────────────────────

/** Reserved operationId (and primary node ID) for input nodes. */
export const INPUT_NODE_ID = "__input__";

/** Reserved operationId for output/tap nodes. */
export const OUTPUT_NODE_ID = "__output__";

/**
 * Sentinel output ID returned when the graph has no operation nodes.
 * Used as a stable React key; never stored in graph state.
 */
const EMPTY_OUTPUT_ID = "__empty__";

/**
 * Sentinel output ID returned when the graph contains a cycle.
 * Used as a stable React key; never stored in graph state.
 */
const CYCLE_OUTPUT_ID = "__cycle__";

// ── Types ─────────────────────────────────────────────────────────────────────

/** One node in the pipeline DAG. */
export interface PipelineNode {
  /** Stable unique identifier within this graph. */
  id: string;
  /**
   * ID of the operation from the OPERATIONS registry, `INPUT_NODE_ID`, or
   * `OUTPUT_NODE_ID`.
   */
  operationId: string;
  /** Current values for each of the operation's configurable parameters. */
  params: Record<string, string>;
  /** Canvas (x, y) position stored so React Flow can restore it on reload. */
  position: { x: number; y: number };
}

/**
 * A directed edge: text output of `source` feeds as input into `target`.
 * For set operation nodes, `targetHandle` specifies which input slot ("a" or "b").
 */
export interface PipelineEdge {
  id: string;
  source: string;
  target: string;
  /** Which input handle on the target node this edge connects to ("a" or "b"). */
  targetHandle?: string;
}

/** The complete pipeline graph: nodes and the edges connecting them. */
export interface PipelineGraph {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

/**
 * A named, saved pipeline snapshot.
 * Version 2 persists the full graph rather than a flat operation list.
 */
export interface SavedPipelineV2 {
  /** Unique ID generated at save time (used as a React key). */
  id: string;
  name: string;
  /** Unix timestamp (ms) of when this snapshot was saved. */
  savedAt: number;
  version: 2;
  graph: PipelineGraph;
}

/** One output produced by `processGraph`. */
export interface GraphOutput {
  /** The node's ID. Stable React key. */
  id: string;
  /** The transformed text produced by that node. */
  text: string;
  /** Optional label from an output/tap node's params. */
  label?: string;
}

// ── Param escape processing ───────────────────────────────────────────────────

/**
 * Expand escape sequences in a single param value.
 * Handles \t (tab), \n (newline), \r (carriage return), \\ (literal backslash).
 * Unknown escapes (e.g. \d, \w) are left as-is so regex syntax passes through.
 */
function unescapeParam(value: string): string {
  let result = "";
  let i = 0;
  while (i < value.length) {
    if (value[i] === "\\" && i + 1 < value.length) {
      const next = value[i + 1];
      if (next === "t")        { result += "\t"; i += 2; }
      else if (next === "n")   { result += "\n"; i += 2; }
      else if (next === "r")   { result += "\r"; i += 2; }
      else if (next === "\\")  { result += "\\"; i += 2; }
      else                     { result += value[i]; i++; } // unknown escape — keep backslash
    } else {
      result += value[i++];
    }
  }
  return result;
}

/** Apply `unescapeParam` to all param values except those marked `raw: true`. */
function unescapeParams(
  params: Record<string, string>,
  paramDefs: ReadonlyArray<{ key: string; raw?: true }> = [],
): Record<string, string> {
  const rawKeys = new Set(paramDefs.filter((p) => p.raw).map((p) => p.key));
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    result[key] = rawKeys.has(key) ? value : unescapeParam(value);
  }
  return result;
}

// ── Graph processing ──────────────────────────────────────────────────────────

/**
 * Execute `input` through the pipeline DAG and return one `GraphOutput` per
 * output/tap node (in graph order) and per leaf node.
 *
 * - Input nodes are pre-seeded with their text (primary from `input`, additional
 *   from their `params.text`).
 * - Set operation nodes receive two inputs via edge handles "a" and "b".
 * - Output/tap nodes are passthroughs that always appear in the result.
 * - Leaf operation nodes (no outgoing edges) also appear in the result.
 *
 * @param input - Raw text for the primary input node (newline-delimited).
 * @param graph - The pipeline DAG to execute.
 */
export function processGraph(graph: PipelineGraph): GraphOutput[] {
  const inputNodes = graph.nodes.filter((n) => n.operationId === INPUT_NODE_ID);
  const execNodes = graph.nodes.filter((n) => n.operationId !== INPUT_NODE_ID);

  if (execNodes.length === 0) return [{ id: EMPTY_OUTPUT_ID, text: "" }];

  // ── Build adjacency structures ─────────────────────────────────────────────
  const childrenOf = new Map<string, string[]>();
  const parentsOf = new Map<string, { source: string; targetHandle?: string }[]>();
  const inDegree = new Map<string, number>();

  for (const node of graph.nodes) {
    childrenOf.set(node.id, []);
    parentsOf.set(node.id, []);
    inDegree.set(node.id, 0);
  }
  for (const edge of graph.edges) {
    childrenOf.get(edge.source)?.push(edge.target);
    parentsOf.get(edge.target)?.push({ source: edge.source, targetHandle: edge.targetHandle });
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  // ── Kahn's BFS topological sort ────────────────────────────────────────────
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const topoOrder: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    topoOrder.push(current);
    for (const child of childrenOf.get(current) ?? []) {
      const newDeg = (inDegree.get(child) ?? 1) - 1;
      inDegree.set(child, newDeg);
      if (newDeg === 0) queue.push(child);
    }
  }

  if (topoOrder.length !== graph.nodes.length) {
    console.warn("processGraph: cycle detected, returning empty output");
    return [{ id: CYCLE_OUTPUT_ID, text: "" }];
  }

  // ── Execute in topological order ───────────────────────────────────────────
  const outputCache = new Map<string, string>();

  // Seed all input nodes from their stored text.
  for (const node of inputNodes) {
    outputCache.set(node.id, node.params.text ?? "");
  }

  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

  for (const id of topoOrder) {
    if (outputCache.has(id)) continue; // already seeded (input nodes)

    const node = nodeById.get(id)!;
    const parents = parentsOf.get(id) ?? [];

    if (node.operationId === OUTPUT_NODE_ID) {
      // Passthrough: output equals first parent's output.
      const parentId = parents[0]?.source;
      outputCache.set(id, parentId ? (outputCache.get(parentId) ?? "") : "");
      continue;
    }

    const op = OPERATIONS_BY_ID.get(node.operationId);

    if (op?.applyMulti) {
      // Multi-input (set operations): resolve inputs by targetHandle.
      const aParent = parents.find((p) => p.targetHandle === "a");
      const bParent = parents.find((p) => p.targetHandle === "b");
      const aText = aParent ? (outputCache.get(aParent.source) ?? "") : "";
      const bText = bParent ? (outputCache.get(bParent.source) ?? "") : "";
      const aLines = aText === "" ? [] : aText.split("\n");
      const bLines = bText === "" ? [] : bText.split("\n");
      outputCache.set(id, op.applyMulti([aLines, bLines], unescapeParams(node.params, op.params)).join("\n"));
    } else {
      // Single-input operations.
      const parentId = parents[0]?.source;
      const sourceText = parentId !== undefined ? (outputCache.get(parentId) ?? "") : "";
      const lines = sourceText === "" ? [] : sourceText.split("\n");
      const resultLines = op ? op.apply(lines, unescapeParams(node.params, op.params)) : lines;
      outputCache.set(id, resultLines.join("\n"));
    }
  }

  // ── Collect outputs ────────────────────────────────────────────────────────
  // Output/tap nodes that have at least one connected parent are always shown.
  const outputTaps = execNodes.filter(
    (n) => n.operationId === OUTPUT_NODE_ID && (parentsOf.get(n.id)?.length ?? 0) > 0,
  );
  // Leaves: non-input, non-output-tap nodes with no outgoing edges.
  const leaves = execNodes.filter(
    (n) => n.operationId !== OUTPUT_NODE_ID && (childrenOf.get(n.id)?.length ?? 0) === 0,
  );

  const allOutputs = [
    ...outputTaps.map((n) => ({
      id: n.id,
      text: outputCache.get(n.id) ?? "",
      label: n.params.label || undefined,
    })),
    ...leaves.map((n) => ({ id: n.id, text: outputCache.get(n.id) ?? "" })),
  ];

  return allOutputs.length > 0 ? allOutputs : [{ id: EMPTY_OUTPUT_ID, text: "" }];
}
