/**
 * Conversion utilities between PipelineGraph and React Flow node/edge formats.
 *
 * These functions bridge the abstract DAG model (`PipelineGraph`) and React Flow's
 * display representation. They are extracted here to keep `PipelineFlowEditor`
 * focused on canvas interaction logic.
 */

import type { InputNodeData } from "@/components/PipelineInputNode";
import type { OpNodeData } from "@/components/PipelineOpNode";
import type { OutputNodeData } from "@/components/PipelineOutputNode";
import { OPERATIONS_BY_ID } from "@/lib/operations";
import { INPUT_NODE_ID, OUTPUT_NODE_ID } from "@/lib/pipelineGraph";
import type { PipelineGraph } from "@/lib/pipelineGraph";
import type { Edge, Node } from "@xyflow/react";

/**
 * Collect a node and all its descendants by following outgoing edges.
 * Used to compute the preview set for a cascade deletion.
 */
export function getDescendantIds(sourceId: string, edges: Edge[]): Set<string> {
  const ids = new Set<string>();
  const queue = [sourceId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    ids.add(id);
    for (const e of edges) {
      if (e.source === id && !ids.has(e.target)) queue.push(e.target);
    }
  }
  return ids;
}

/** Callbacks injected into each React Flow node's `data` object. */
export interface GraphToFlowCallbacks {
  onUpdateParam: (nodeId: string, key: string, value: string) => void;
  onRemoveNode: (nodeId: string) => void;
  onSwapWithParent: (nodeId: string) => void;
  onSwapWithChild: (nodeId: string) => void;
  /** Notify the editor of the node being hovered for a swap preview. */
  onSwapHover: (nodeId: string | null) => void;
  /** Notify the editor of the node being hovered for a cascade-delete preview. */
  onCascadeHover: (nodeId: string | null) => void;
  onRemoveCascadeNode: (nodeId: string) => void;
}

/**
 * Convert a `PipelineGraph` to the node/edge arrays React Flow expects.
 *
 * Each node's `data` receives the appropriate callbacks so that user interactions
 * (button clicks, input changes) propagate back to graph state.
 */
export function graphToFlow(
  graph: PipelineGraph,
  callbacks: GraphToFlowCallbacks,
  selectedNodeId: string | null,
): { nodes: Node[]; edges: Edge[] } {
  const {
    onUpdateParam,
    onRemoveNode,
    onSwapWithParent,
    onSwapWithChild,
    onSwapHover,
    onCascadeHover,
    onRemoveCascadeNode,
  } = callbacks;

  // Build adjacency maps for canMoveUp/Down computation.
  const parentOf = new Map<string, string>();
  const childrenOf = new Map<string, string[]>();
  for (const node of graph.nodes) childrenOf.set(node.id, []);
  for (const edge of graph.edges) {
    parentOf.set(edge.target, edge.source);
    childrenOf.get(edge.source)?.push(edge.target);
  }

  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

  const nodes: Node[] = graph.nodes.map((n) => {
    if (n.operationId === INPUT_NODE_ID) {
      return {
        id: n.id,
        type: "pipeline-input" as const,
        position: n.position,
        selected: n.id === selectedNodeId,
        deletable: n.id !== INPUT_NODE_ID,
        data: {
          text: n.params.text ?? "",
          onTextChange: (v: string) => onUpdateParam(n.id, "text", v),
          onRemove: n.id !== INPUT_NODE_ID ? () => onRemoveNode(n.id) : undefined,
        } satisfies InputNodeData,
      };
    }

    if (n.operationId === OUTPUT_NODE_ID) {
      return {
        id: n.id,
        type: "pipeline-output" as const,
        position: n.position,
        selected: n.id === selectedNodeId,
        data: {
          params: n.params,
          onUpdateParam: (key: string, value: string) => onUpdateParam(n.id, key, value),
          onRemove: () => onRemoveNode(n.id),
          highlighted: false,
        } satisfies OutputNodeData,
      };
    }

    const parentId = parentOf.get(n.id);
    const children = childrenOf.get(n.id) ?? [];
    const op = OPERATIONS_BY_ID.get(n.operationId);

    // Reordering is disabled for set operations (multi-input).
    const parentNode = parentId ? nodeById.get(parentId) : undefined;
    const singleChild = children.length === 1 ? nodeById.get(children[0]) : undefined;
    const canMoveUp =
      !op?.multiInput &&
      !!parentId &&
      !!parentNode &&
      parentNode.operationId !== INPUT_NODE_ID &&
      parentNode.operationId !== OUTPUT_NODE_ID;
    const canMoveDown =
      !op?.multiInput &&
      !!singleChild &&
      singleChild.operationId !== INPUT_NODE_ID &&
      singleChild.operationId !== OUTPUT_NODE_ID;

    return {
      id: n.id,
      type: "op" as const,
      position: n.position,
      selected: n.id === selectedNodeId,
      data: {
        operationId: n.operationId,
        params: n.params,
        onUpdateParam: (key: string, value: string) => onUpdateParam(n.id, key, value),
        onRemove: () => onRemoveNode(n.id),
        onRemoveCascade: () => onRemoveCascadeNode(n.id),
        onMoveUp: () => onSwapWithParent(n.id),
        onMoveDown: () => onSwapWithChild(n.id),
        canMoveUp,
        canMoveDown,
        onSwapHover,
        onCascadeHover,
        swapUpTargetId: canMoveUp ? parentId : undefined,
        swapDownTargetId: canMoveDown ? children[0] : undefined,
        shiftHeld: false,
        deletePending: false,
        multiInput: op?.multiInput,
      } satisfies OpNodeData,
      ariaLabel: op?.name,
    };
  });

  const edges: Edge[] = graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    ...(e.targetHandle ? { targetHandle: e.targetHandle } : {}),
  }));

  return { nodes, edges };
}

/**
 * Strip React Flow–specific fields and return a plain `PipelineGraph`
 * suitable for persistence and pipeline execution.
 */
export function flowToGraph(rfNodes: Node[], rfEdges: Edge[]): PipelineGraph {
  return {
    nodes: rfNodes.map((n) => {
      if (n.type === "pipeline-input") {
        return {
          id: n.id,
          operationId: INPUT_NODE_ID,
          params: { text: (n.data as InputNodeData).text ?? "" },
          position: n.position,
        };
      }
      if (n.type === "pipeline-output") {
        return {
          id: n.id,
          operationId: OUTPUT_NODE_ID,
          params: {},
          position: n.position,
        };
      }
      return {
        id: n.id,
        operationId: (n.data as OpNodeData).operationId,
        params: (n.data as OpNodeData).params,
        position: n.position,
      };
    }),
    edges: rfEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      ...(e.targetHandle ? { targetHandle: e.targetHandle } : {}),
    })),
  };
}
