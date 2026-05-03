"use client";

import {
  Background,
  Controls,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import type {
  Connection,
  Edge,
  IsValidConnection,
  Node,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PipelineInputNode } from "@/components/PipelineInputNode";
import type { InputNodeData } from "@/components/PipelineInputNode";
import { PipelineOpNode } from "@/components/PipelineOpNode";
import type { OpNodeData } from "@/components/PipelineOpNode";
import type { PipelineGraph } from "@/lib/pipelineGraph";
import { INPUT_NODE_ID } from "@/lib/pipelineGraph";
import { OPERATIONS } from "@/lib/operations";
import { useTheme } from "@once-ui-system/core";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";

// Node type map is defined outside the component so React Flow receives a stable
// reference and does not remount nodes on every parent re-render.
const NODE_TYPES = { op: PipelineOpNode, "pipeline-input": PipelineInputNode };

/**
 * Walk the edge list backwards from `leafId`, collecting every ancestor node ID
 * and the connecting edge ID along the path to the root. Used to highlight the
 * active pipeline path when a leaf node is hovered.
 */
function getAncestorPath(
  leafId: string,
  edges: Edge[],
): { nodeIds: Set<string>; edgeIds: Set<string> } {
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  let current: string | undefined = leafId;
  while (current) {
    nodeIds.add(current);
    const parentEdge = edges.find((e) => e.target === current);
    if (!parentEdge) break;
    edgeIds.add(parentEdge.id);
    current = parentEdge.source;
  }
  return { nodeIds, edgeIds };
}

export type OpNode = Node<OpNodeData, "op">;

// ── Conversion helpers ────────────────────────────────────────────────────────

/**
 * Convert a `PipelineGraph` to the node/edge format React Flow expects.
 *
 * Callbacks (onUpdateParam, onRemoveNode, etc.) are attached to node data here
 * because React Flow node components receive data as a plain prop and cannot
 * directly close over parent-component state.
 *
 * This is a one-way conversion — call `flowToGraph` to go the other direction.
 */
function graphToFlow(
  graph: PipelineGraph,
  onUpdateParam: (nodeId: string, key: string, value: string) => void,
  onRemoveNode: (nodeId: string) => void,
  onSwapWithParent: (nodeId: string) => void,
  onSwapWithChild: (nodeId: string) => void,
  onSwapHover: (nodeId: string | null) => void,
  inputText: string,
  onInputChange: (text: string) => void,
  selectedNodeId: string | null,
): { nodes: Node[]; edges: Edge[] } {
  // Build adjacency maps for canMoveUp/Down computation.
  const parentOf = new Map<string, string>();
  const childrenOf = new Map<string, string[]>();
  for (const node of graph.nodes) childrenOf.set(node.id, []);
  for (const edge of graph.edges) {
    parentOf.set(edge.target, edge.source);
    childrenOf.get(edge.source)?.push(edge.target);
  }

  const nodes: Node[] = graph.nodes.map((n) => {
    if (n.id === INPUT_NODE_ID) {
      return {
        id: n.id,
        type: "pipeline-input" as const,
        position: n.position,
        selected: n.id === selectedNodeId,
        deletable: false,
        data: { inputText, onInputChange } satisfies InputNodeData,
      };
    }

    const parentId = parentOf.get(n.id);
    const children = childrenOf.get(n.id) ?? [];
    // Can move up: parent is a real op node (not the input node).
    const canMoveUp = !!parentId && parentId !== INPUT_NODE_ID;
    // Can move down: has exactly one child (child always has one parent by graph invariant).
    const canMoveDown = children.length === 1;

    const op = OPERATIONS.find((o) => o.id === n.operationId);
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
        onMoveUp: () => onSwapWithParent(n.id),
        onMoveDown: () => onSwapWithChild(n.id),
        canMoveUp,
        canMoveDown,
        onSwapHover,
        swapUpTargetId: canMoveUp ? parentId : undefined,
        swapDownTargetId: canMoveDown ? children[0] : undefined,
      },
      ariaLabel: op?.name,
    };
  });

  const edges: Edge[] = graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
  }));

  return { nodes, edges };
}

/**
 * Strip React Flow–specific fields from nodes/edges and return a plain
 * `PipelineGraph` suitable for persistence and pipeline execution.
 */
function flowToGraph(rfNodes: Node[], rfEdges: Edge[]): PipelineGraph {
  return {
    nodes: rfNodes.map((n) => ({
      id: n.id,
      operationId: n.id === INPUT_NODE_ID ? INPUT_NODE_ID : (n.data as OpNodeData).operationId,
      params: n.id === INPUT_NODE_ID ? {} : (n.data as OpNodeData).params,
      position: n.position,
    })),
    edges: rfEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    })),
  };
}

// ── Intersection helper ───────────────────────────────────────────────────────

type Position = { x: number; y: number };
type FindFreePosition = (pos: Position) => Position;

// Estimated op-node dimensions used for intersection checking (see PipelineOpNode styles).
const NODE_W = 280; // matches maxWidth
const NODE_H = 120; // approximates height with one param input

const NUDGE_STEP = NODE_H + 20; // vertical step when searching for a free position

/**
 * A render-null component that lives inside `<ReactFlow>` (giving it access to
 * the ReactFlow context) and writes a `findFreePosition` helper into the
 * provided ref on every render.
 *
 * This pattern is necessary because `useReactFlow` can only be called inside a
 * descendant of the `ReactFlow` provider, but the position-finding logic needs
 * to run in the parent before a new node is added to the graph.
 */
function IntersectionHelper({
  findFreePositionRef,
}: {
  findFreePositionRef: React.MutableRefObject<FindFreePosition | undefined>;
}) {
  const { getIntersectingNodes } = useReactFlow();

  findFreePositionRef.current = (pos) => {
    let candidate = { ...pos };
    for (let i = 0; i < 30; i++) {
      const hits = getIntersectingNodes(
        { x: candidate.x, y: candidate.y, width: NODE_W, height: NODE_H },
        true,
      );
      if (hits.length === 0) return candidate;
      candidate = { ...candidate, x: candidate.x + NUDGE_STEP };
    }
    return candidate;
  };

  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Props for PipelineFlowEditor.
 *
 * The component maintains its own React Flow state (rfNodes/rfEdges) that
 * mirrors the authoritative `graph` prop. Changes originating inside React
 * Flow (drags, deletions, new connections) are propagated out via `onGraphChange`.
 * Changes originating outside (adding an operation from the palette) arrive via
 * the `graph` prop and are synced in using a `useEffect`.
 */
interface PipelineFlowEditorProps {
  graph: PipelineGraph;
  onGraphChange: (graph: PipelineGraph) => void;
  onUpdateParam: (nodeId: string, key: string, value: string) => void;
  onRemoveNode: (nodeId: string) => void;
  onSwapWithParent: (nodeId: string) => void;
  onSwapWithChild: (nodeId: string) => void;
  inputText: string;
  onInputChange: (text: string) => void;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onHoverLeafNode: (id: string | null) => void;
  hoveredOutputId: string | null;
  findFreePositionRef: React.MutableRefObject<FindFreePosition | undefined>;
}

/**
 * Interactive React Flow canvas for the pipeline graph.
 *
 * Maintains a local copy of nodes/edges in React Flow's format and
 * bidirectionally syncs with the authoritative `PipelineGraph` managed by
 * `usePipeline`. Handles drag-to-reposition, Delete-key removal, manual edge
 * connections, leaf-node hover highlighting, and swap-target highlighting.
 */
export function PipelineFlowEditor({
  graph,
  onGraphChange,
  onUpdateParam,
  onRemoveNode,
  onSwapWithParent,
  onSwapWithChild,
  inputText,
  onInputChange,
  selectedNodeId,
  onSelectNode,
  onHoverLeafNode,
  hoveredOutputId,
  findFreePositionRef,
}: PipelineFlowEditorProps) {
  const { theme } = useTheme();
  const [colorMode, setColorMode] = useState<"light" | "dark">("light");
  useEffect(() => {
    setColorMode(
      (document.documentElement.getAttribute("data-theme") as "light" | "dark") ?? "light",
    );
  }, [theme]);

  const [swapHoverTargetId, setSwapHoverTargetId] = useState<string | null>(null);

  const { nodes: initialNodes, edges: initialEdges } = graphToFlow(
    graph,
    onUpdateParam,
    onRemoveNode,
    onSwapWithParent,
    onSwapWithChild,
    setSwapHoverTargetId,
    inputText,
    onInputChange,
    selectedNodeId,
  );

  const [rfNodes, setRFNodes, onRFNodesChange] = useNodesState<Node>(initialNodes);
  const [rfEdges, setRFEdges, onRFEdgesChange] = useEdgesState(initialEdges);

  // Tracks the last graph we synced FROM, so the graph→RF sync effect can
  // distinguish external prop changes from changes it wrote itself (which would
  // otherwise trigger a redundant rebuild of the entire RF node/edge list).
  const prevGraphRef = useRef(graph);

  // Sync graph → RF when graph changes externally (e.g., palette adds a node).
  useEffect(() => {
    if (prevGraphRef.current === graph) return;
    prevGraphRef.current = graph;
    const { nodes, edges } = graphToFlow(
      graph,
      onUpdateParam,
      onRemoveNode,
      onSwapWithParent,
      onSwapWithChild,
      setSwapHoverTargetId,
      inputText,
      onInputChange,
      selectedNodeId,
    );
    setRFNodes(nodes);
    setRFEdges(edges);
  }, [
    graph,
    onUpdateParam,
    onRemoveNode,
    onSwapWithParent,
    onSwapWithChild,
    setSwapHoverTargetId,
    selectedNodeId,
    setRFNodes,
    setRFEdges,
  ]);

  // Update only the input node's data when inputText changes, without rebuilding all nodes.
  useEffect(() => {
    setRFNodes((prev) =>
      prev.map((n) =>
        n.id === INPUT_NODE_ID ? { ...n, data: { ...n.data, inputText, onInputChange } } : n,
      ),
    );
  }, [inputText, onInputChange, setRFNodes]);

  useEffect(() => {
    setRFNodes((prev) =>
      prev.map((n) => ({ ...n, data: { ...n.data, swapHighlighted: n.id === swapHoverTargetId } })),
    );
  }, [swapHoverTargetId, setRFNodes]);

  // Local leaf hover (from canvas); combined with hoveredOutputId (from right panel).
  const [hoveredLocalLeafId, setHoveredLocalLeafId] = useState<string | null>(null);
  const activeLeafId = hoveredLocalLeafId ?? hoveredOutputId;

  // Highlight the full ancestor path (nodes + edges) for the active leaf.
  useEffect(() => {
    if (!activeLeafId) {
      setRFNodes((prev) => prev.map((n) => ({ ...n, data: { ...n.data, highlighted: false } })));
      setRFEdges((prev) => prev.map((e) => ({ ...e, animated: false, style: undefined })));
      return;
    }
    const { nodeIds, edgeIds } = getAncestorPath(activeLeafId, graph.edges);
    setRFNodes((prev) =>
      prev.map((n) => ({ ...n, data: { ...n.data, highlighted: nodeIds.has(n.id) } })),
    );
    setRFEdges((prev) =>
      prev.map((e) => ({
        ...e,
        animated: edgeIds.has(e.id),
        style: edgeIds.has(e.id)
          ? { stroke: "var(--brand-solid-strong)", strokeWidth: 2 }
          : undefined,
      })),
    );
  }, [activeLeafId, graph.edges, setRFNodes, setRFEdges]);

  const handleNodesChange: OnNodesChange<Node> = useCallback(
    (changes) => {
      onRFNodesChange(changes);
      for (const change of changes) {
        // Sync final drag position to graph (not during drag, to avoid excessive updates).
        if (change.type === "position" && !change.dragging && change.position) {
          const updatedNodes = rfNodes.map((n) =>
            n.id === change.id ? { ...n, position: change.position! } : n,
          );
          const newGraph = flowToGraph(updatedNodes, rfEdges);
          prevGraphRef.current = newGraph;
          onGraphChange(newGraph);
          break;
        }
        // Sync node removal to graph (e.g. Delete key) — input node cannot be removed.
        if (change.type === "remove" && change.id !== INPUT_NODE_ID) {
          if (change.id === selectedNodeId) onSelectNode(null);
          const removedId = change.id;
          const inEdge = rfEdges.find((e) => e.target === removedId);
          const outEdges = rfEdges.filter((e) => e.source === removedId);
          const bridged = rfEdges.filter((e) => e.source !== removedId && e.target !== removedId);
          if (inEdge) {
            for (const outEdge of outEdges) {
              bridged.push({
                id: `e-${inEdge.source}-${outEdge.target}`,
                source: inEdge.source,
                target: outEdge.target,
              });
            }
          }
          setRFEdges(bridged);
          const newGraph = flowToGraph(
            rfNodes.filter((n) => n.id !== removedId),
            bridged,
          );
          prevGraphRef.current = newGraph;
          onGraphChange(newGraph);
          break;
        }
      }
    },
    [onRFNodesChange, rfNodes, rfEdges, graph, onGraphChange, selectedNodeId, onSelectNode],
  );

  const handleNodeClick = useCallback(
    (_e: MouseEvent, node: Node) => onSelectNode(node.id),
    [onSelectNode],
  );

  const handlePaneClick = useCallback(() => onSelectNode(null), [onSelectNode]);

  const handleNodeMouseEnter = useCallback(
    (_e: MouseEvent, node: Node) => {
      const isLeaf = node.id !== INPUT_NODE_ID && !rfEdges.some((e) => e.source === node.id);
      if (isLeaf) {
        setHoveredLocalLeafId(node.id);
        onHoverLeafNode(node.id);
      }
    },
    [rfEdges, onHoverLeafNode],
  );

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredLocalLeafId(null);
    onHoverLeafNode(null);
  }, [onHoverLeafNode]);

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onRFEdgesChange(changes);
      for (const change of changes) {
        if (change.type === "remove") {
          const newGraph = flowToGraph(
            rfNodes,
            rfEdges.filter((e) => e.id !== change.id),
          );
          prevGraphRef.current = newGraph;
          onGraphChange(newGraph);
          break;
        }
      }
    },
    [onRFEdgesChange, rfNodes, rfEdges, graph, onGraphChange],
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const newEdges = addEdge(connection, rfEdges);
      setRFEdges(newEdges);
      const newGraph = flowToGraph(rfNodes, newEdges);
      prevGraphRef.current = newGraph;
      onGraphChange(newGraph);
    },
    [setRFEdges, rfEdges, rfNodes, graph, onGraphChange],
  );

  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      if (connection.target === INPUT_NODE_ID) return false;
      // Each node may only have one incoming edge (diverging only, not converging).
      const targetAlreadyHasParent = rfEdges.some((e) => e.target === connection.target);
      return !targetAlreadyHasParent && connection.source !== connection.target;
    },
    [rfEdges],
  );

  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        nodeTypes={NODE_TYPES}
        multiSelectionKeyCode={null}
        fitView
        deleteKeyCode="Delete"
        colorMode={colorMode}
      >
        <Background />
        <Controls />
        <IntersectionHelper findFreePositionRef={findFreePositionRef} />
      </ReactFlow>
    </div>
  );
}
