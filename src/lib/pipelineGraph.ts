import { OPERATIONS } from "./textOperations";

/** Reserved ID for the always-present input node. */
export const INPUT_NODE_ID = "__input__";

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

/** The full pipeline DAG. */
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
export interface GraphOutput {
  /** The node ID of the leaf that produced this output. Stable React key. */
  id: string;
  text: string;
}

export function processGraph(input: string, graph: PipelineGraph): GraphOutput[] {
  const opNodes = graph.nodes.filter((n) => n.id !== INPUT_NODE_ID);
  if (opNodes.length === 0) return [{ id: "__empty__", text: "" }];

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
    return [{ id: "__cycle__", text: "" }];
  }

  // The input node passes through the raw input text; seed the cache before processing.
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

  // Collect leaf operation nodes (exclude the input node itself).
  const leaves = topoOrder.filter(
    (id) => id !== INPUT_NODE_ID && (childrenOf.get(id)?.length ?? 0) === 0,
  );
  return leaves.length > 0
    ? leaves.map((id) => ({ id, text: outputCache.get(id) ?? "" }))
    : [{ id: "__empty__", text: "" }];
}

