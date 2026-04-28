import { OPERATIONS } from "./textOperations";
import type { PipelineItem, SavedPipeline } from "./textOperations";

// ── Types ─────────────────────────────────────────────────────────────────────

/** One node in the pipeline DAG. Doubles as a React Flow node. */
export interface PipelineNode {
  id: string;
  operationId: string;
  params: Record<string, string>;
  /** Canvas position stored so React Flow can restore it on reload. */
  position: { x: number; y: number };
}

/** A directed edge: output of `source` feeds into `target`. */
export interface PipelineEdge {
  id: string;
  source: string;
  target: string;
}

/** The full DAG that replaces the linear PipelineItem[]. */
export interface PipelineGraph {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

/** V2 saved pipeline — stores a graph instead of a flat array. */
export interface SavedPipelineV2 {
  id: string;
  name: string;
  savedAt: number;
  version: 2;
  graph: PipelineGraph;
}

/** Union of what may be read from localStorage. */
export type AnyPersistedPipeline = SavedPipeline | SavedPipelineV2;

// ── Type guards ───────────────────────────────────────────────────────────────

export function isSavedPipelineV2(p: AnyPersistedPipeline): p is SavedPipelineV2 {
  return (p as SavedPipelineV2).version === 2;
}

// ── Graph processing ──────────────────────────────────────────────────────────

/**
 * Execute `input` through the DAG and return one output string per leaf node
 * (a node with no outgoing edges), in topological discovery order.
 *
 * Diverging is handled naturally: each node's computed text is cached and
 * independently read by each of its children.
 *
 * Returns `[""]` when the graph is empty or a cycle is detected.
 */
export function processGraph(input: string, graph: PipelineGraph): string[] {
  if (graph.nodes.length === 0) return [""];

  // Build adjacency structures in one pass over edges.
  const childrenOf = new Map<string, string[]>();
  const parentOf = new Map<string, string>();
  const inDegree = new Map<string, number>();

  for (const node of graph.nodes) {
    childrenOf.set(node.id, []);
    inDegree.set(node.id, 0);
  }
  for (const edge of graph.edges) {
    childrenOf.get(edge.source)?.push(edge.target);
    parentOf.set(edge.target, edge.source);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  // Kahn's BFS topological sort.
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }
  const topoOrder: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    topoOrder.push(current);
    for (const child of childrenOf.get(current) ?? []) {
      const newDeg = (inDegree.get(child) ?? 1) - 1;
      inDegree.set(child, newDeg);
      if (newDeg === 0) queue.push(child);
    }
  }

  if (topoOrder.length !== graph.nodes.length) {
    // Cycle detected — graph is not a valid DAG.
    console.warn("processGraph: cycle detected, returning empty output");
    return [""];
  }

  // Process nodes in topological order.
  const outputCache = new Map<string, string>();
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

  for (const id of topoOrder) {
    const node = nodeById.get(id)!;
    const sourceText = parentOf.has(id) ? (outputCache.get(parentOf.get(id)!) ?? input) : input;
    const op = OPERATIONS.find((o) => o.id === node.operationId);
    const lines = sourceText === "" ? [] : sourceText.split("\n");
    const resultLines = op ? op.apply(lines, node.params) : lines;
    outputCache.set(id, resultLines.join("\n"));
  }

  // Collect leaf nodes (nodes with no children) in topo order.
  const leaves = topoOrder.filter((id) => (childrenOf.get(id)?.length ?? 0) === 0);
  return leaves.length > 0 ? leaves.map((id) => outputCache.get(id) ?? "") : [""];
}

// ── Conversion helpers ────────────────────────────────────────────────────────

/**
 * Convert a linear PipelineItem[] to a single-chain PipelineGraph.
 * Nodes are stacked vertically at x=200, spaced 120px apart.
 */
export function linearItemsToGraph(items: PipelineItem[]): PipelineGraph {
  const nodes: PipelineNode[] = items.map((item, i) => ({
    id: item.instanceId,
    operationId: item.operationId,
    params: item.params,
    position: { x: 200, y: i * 120 },
  }));

  const edges: PipelineEdge[] = items.slice(1).map((item, i) => ({
    id: `e-${items[i].instanceId}-${item.instanceId}`,
    source: items[i].instanceId,
    target: item.instanceId,
  }));

  return { nodes, edges };
}

/**
 * Flatten a PipelineGraph back to a PipelineItem[] by topological sort.
 * Used to keep the existing list-view UI working without changes.
 */
export function graphToLinearItems(graph: PipelineGraph): PipelineItem[] {
  if (graph.nodes.length === 0) return [];

  const childrenOf = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const node of graph.nodes) {
    childrenOf.set(node.id, []);
    inDegree.set(node.id, 0);
  }
  for (const edge of graph.edges) {
    childrenOf.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const child of childrenOf.get(id) ?? []) {
      const d = (inDegree.get(child) ?? 1) - 1;
      inDegree.set(child, d);
      if (d === 0) queue.push(child);
    }
  }

  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  return order.map((id) => {
    const n = nodeById.get(id)!;
    return { instanceId: n.id, operationId: n.operationId, params: n.params };
  });
}

// ── Migration ─────────────────────────────────────────────────────────────────

/**
 * Convert a legacy v1 SavedPipeline (with pipeline: PipelineItem[]) to
 * SavedPipelineV2 (with graph: PipelineGraph). Positions are auto-generated
 * in a single vertical chain so the React Flow canvas immediately looks clean.
 */
export function migrateSavedPipeline(saved: SavedPipeline): SavedPipelineV2 {
  return {
    id: saved.id,
    name: saved.name,
    savedAt: saved.savedAt,
    version: 2,
    graph: linearItemsToGraph(saved.pipeline ?? []),
  };
}
