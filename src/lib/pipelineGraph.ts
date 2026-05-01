/**
 * Pipeline graph — type definitions and DAG execution engine for Glyph Weaver.
 *
 * A pipeline is a directed acyclic graph (DAG) where:
 *  - The single input node (`INPUT_NODE_ID`) is the root and provides raw text.
 *  - Operation nodes transform text received from their parent.
 *  - The graph may fan out (one parent, multiple children) but not fan in —
 *    each node has at most one parent. Multi-parent merging is not supported.
 *  - Leaf nodes (no outgoing edges) produce the visible outputs.
 *
 * @module pipelineGraph
 */

import { OPERATIONS } from "./operations";

// ── Sentinel IDs ──────────────────────────────────────────────────────────────

/** Reserved node ID for the always-present input node. */
export const INPUT_NODE_ID = "__input__";

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
  /** ID of the operation from the OPERATIONS registry, or `INPUT_NODE_ID`. */
  operationId: string;
  /** Current values for each of the operation's configurable parameters. */
  params: Record<string, string>;
  /** Canvas (x, y) position stored so React Flow can restore it on reload. */
  position: { x: number; y: number };
}

/** A directed edge: text output of `source` feeds as input into `target`. */
export interface PipelineEdge {
  id: string;
  source: string;
  target: string;
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

/** One output produced by `processGraph` — one per leaf node. */
export interface GraphOutput {
  /** The leaf node's ID. Stable React key. */
  id: string;
  /** The final transformed text produced by that leaf. */
  text: string;
}

// ── Graph processing ──────────────────────────────────────────────────────────

/**
 * Execute `input` through the pipeline DAG and return one `GraphOutput` per
 * leaf node (a node with no outgoing edges), in topological discovery order.
 *
 * Diverging paths (fan-out) are handled naturally: each node's result is
 * cached after computation and independently read by each of its children.
 *
 * @param input - Raw text to feed into the input node (newline-delimited).
 * @param graph - The pipeline DAG to execute.
 * @returns One output per leaf, or `[{ id: EMPTY_OUTPUT_ID, text: "" }]` when
 *          there are no operation nodes or a cycle is detected.
 */
export function processGraph(input: string, graph: PipelineGraph): GraphOutput[] {
  const opNodes = graph.nodes.filter((n) => n.id !== INPUT_NODE_ID);
  if (opNodes.length === 0) return [{ id: EMPTY_OUTPUT_ID, text: "" }];

  // ── Build adjacency structures in a single pass over edges ─────────────────
  const childrenOf = new Map<string, string[]>();
  const parentOf = new Map<string, string>(); // single parent per node (fan-in not supported)
  const inDegree = new Map<string, number>();

  for (const node of graph.nodes) {
    childrenOf.set(node.id, []);
    inDegree.set(node.id, 0);
  }
  for (const edge of graph.edges) {
    childrenOf.get(edge.source)?.push(edge.target);
    parentOf.set(edge.target, edge.source); // overwrites if multiple parents exist
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  // ── Kahn's BFS topological sort ────────────────────────────────────────────
  // Seed the queue with all nodes that have no incoming edges (roots).
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const topoOrder: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    topoOrder.push(current);
    // Decrement in-degree of each child; enqueue when it reaches zero.
    for (const child of childrenOf.get(current) ?? []) {
      const newDeg = (inDegree.get(child) ?? 1) - 1;
      inDegree.set(child, newDeg);
      if (newDeg === 0) queue.push(child);
    }
  }

  // If not all nodes were visited, the graph contains a cycle.
  if (topoOrder.length !== graph.nodes.length) {
    console.warn("processGraph: cycle detected, returning empty output");
    return [{ id: CYCLE_OUTPUT_ID, text: "" }];
  }

  // ── Execute operations in topological order ────────────────────────────────
  // The input node is pre-seeded; every other node reads from its parent's cache.
  const outputCache = new Map<string, string>();
  outputCache.set(INPUT_NODE_ID, input);

  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

  for (const id of topoOrder) {
    if (id === INPUT_NODE_ID) continue; // already seeded above

    const node = nodeById.get(id);
    if (!node) continue;

    const parentId = parentOf.get(id);
    const sourceText = parentId !== undefined ? (outputCache.get(parentId) ?? input) : input;
    const op = OPERATIONS.find((o) => o.id === node.operationId);
    const lines = sourceText === "" ? [] : sourceText.split("\n");
    const resultLines = op ? op.apply(lines, node.params) : lines;
    outputCache.set(id, resultLines.join("\n"));
  }

  // ── Collect leaf outputs ───────────────────────────────────────────────────
  const leaves = topoOrder.filter(
    (id) => id !== INPUT_NODE_ID && (childrenOf.get(id)?.length ?? 0) === 0,
  );
  return leaves.length > 0
    ? leaves.map((id) => ({ id, text: outputCache.get(id) ?? "" }))
    : [{ id: EMPTY_OUTPUT_ID, text: "" }];
}
