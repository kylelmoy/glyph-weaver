"use client";

import {
  Background,
  Controls,
  ReactFlow,
  addEdge,
  reconnectEdge,
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
import { PipelineOutputNode } from "@/components/PipelineOutputNode";
import type { OutputNodeData } from "@/components/PipelineOutputNode";
import type { GraphOutput, PipelineGraph } from "@/lib/pipelineGraph";
import { INPUT_NODE_ID, OUTPUT_NODE_ID } from "@/lib/pipelineGraph";
import { OPERATIONS } from "@/lib/operations";
import { useTheme } from "@once-ui-system/core";
import { useCallback, useEffect, useRef, useState } from "react";

// Node type map is defined outside the component so React Flow receives a stable
// reference and does not remount nodes on every parent re-render.
const NODE_TYPES = {
  op: PipelineOpNode,
  "pipeline-input": PipelineInputNode,
  "pipeline-output": PipelineOutputNode,
};

export type OpNode = Node<OpNodeData, "op">;

/**
 * Collect a node and all its descendants by following outgoing edges.
 * Used to compute the preview set for a cascade deletion.
 */
function getDescendantIds(sourceId: string, edges: Edge[]): Set<string> {
  const ids = new Set<string>();
  const queue = [sourceId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    ids.add(id);
    edges.filter((e) => e.source === id).forEach((e) => {
      if (!ids.has(e.target)) queue.push(e.target);
    });
  }
  return ids;
}

// ── Conversion helpers ────────────────────────────────────────────────────────

/**
 * Convert a `PipelineGraph` to the node/edge format React Flow expects.
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
  onCascadeHover: (nodeId: string | null) => void,
  onRemoveCascadeNode: (nodeId: string) => void,
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
    if (n.operationId === INPUT_NODE_ID) {
      const isPrimary = n.id === INPUT_NODE_ID;
      return {
        id: n.id,
        type: "pipeline-input" as const,
        position: n.position,
        selected: n.id === selectedNodeId,
        deletable: !isPrimary,
        data: (isPrimary
          ? { inputText, onInputChange, isPrimary: true }
          : {
              text: n.params.text ?? "",
              onTextChange: (v: string) => onUpdateParam(n.id, "text", v),
              onRemove: () => onRemoveNode(n.id),
              isPrimary: false,
            }) satisfies InputNodeData,
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
    const op = OPERATIONS.find((o) => o.id === n.operationId);

    // Reordering is disabled for set operations (multi-input).
    const parentNode = parentId ? graph.nodes.find((p) => p.id === parentId) : undefined;
    const singleChild = children.length === 1 ? graph.nodes.find((c) => c.id === children[0]) : undefined;
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
 * Strip React Flow–specific fields from nodes/edges and return a plain
 * `PipelineGraph` suitable for persistence and pipeline execution.
 */
function flowToGraph(rfNodes: Node[], rfEdges: Edge[]): PipelineGraph {
  return {
    nodes: rfNodes.map((n) => {
      if (n.type === "pipeline-input") {
        const inputData = n.data as InputNodeData;
        return {
          id: n.id,
          operationId: INPUT_NODE_ID,
          params: n.id === INPUT_NODE_ID ? {} : { text: inputData.text ?? "" },
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

// ── Intersection helper ───────────────────────────────────────────────────────

type Position = { x: number; y: number };
type FindFreePosition = (pos: Position, nudgeRight: boolean) => Position;

// Estimated op-node dimensions used for intersection checking (see PipelineOpNode styles).
const NODE_W = 280; // matches maxWidth
const NODE_H = 120; // approximates height with one param input

const NUDGE_STEP_X = NODE_W + 40; // horizontal step (right nudge, legacy use)
const NUDGE_STEP_Y = NODE_H + 20; // vertical step (down nudge, default for L-to-R layout)

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

  findFreePositionRef.current = (pos, nudgeRight) => {
    let candidate = { ...pos };
    for (let i = 0; i < 30; i++) {
      const hits = getIntersectingNodes(
        { x: candidate.x, y: candidate.y, width: NODE_W, height: NODE_H },
        true,
      );
      if (hits.length === 0) return candidate;
      if (nudgeRight) {
        candidate = { ...candidate, x: candidate.x + NUDGE_STEP_X };
      } else {
        candidate = { ...candidate, y: candidate.y + NUDGE_STEP_Y };
      }
    }
    return candidate;
  };

  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

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
  findFreePositionRef: React.MutableRefObject<FindFreePosition | undefined>;
  onRemoveCascadeNode: (nodeId: string) => void;
  outputs: GraphOutput[];
}

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
  findFreePositionRef,
  onRemoveCascadeNode,
  outputs,
}: PipelineFlowEditorProps) {
  const { theme } = useTheme();
  const [colorMode, setColorMode] = useState<"light" | "dark">("light");
  useEffect(() => {
    setColorMode(
      (document.documentElement.getAttribute("data-theme") as "light" | "dark") ?? "light",
    );
  }, [theme]);

  const [swapHoverTargetId, setSwapHoverTargetId] = useState<string | null>(null);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [cascadeHoverSourceId, setCascadeHoverSourceId] = useState<string | null>(null);

  // Track the Shift key globally so node components can react to it.
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === "Shift") setShiftHeld(true); };
    const up = (e: KeyboardEvent) => { if (e.key === "Shift") setShiftHeld(false); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

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
    setCascadeHoverSourceId,
    onRemoveCascadeNode,
  );

  const [rfNodes, setRFNodes, onRFNodesChange] = useNodesState<Node>(initialNodes);
  const [rfEdges, setRFEdges, onRFEdgesChange] = useEdgesState(initialEdges);

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
      setCascadeHoverSourceId,
      onRemoveCascadeNode,
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
    onRemoveCascadeNode,
  ]);

  // Update only the primary input node's data when inputText changes.
  useEffect(() => {
    setRFNodes((prev) =>
      prev.map((n) =>
        n.id === INPUT_NODE_ID ? { ...n, data: { ...n.data, inputText, onInputChange } } : n,
      ),
    );
  }, [inputText, onInputChange, setRFNodes]);

  // Sync computed output text into each output node's data.
  useEffect(() => {
    const textById = new Map(outputs.map((o) => [o.id, o.text]));
    setRFNodes((prev) =>
      prev.map((n) =>
        n.type === "pipeline-output" ? { ...n, data: { ...n.data, text: textById.get(n.id) ?? "" } } : n,
      ),
    );
  }, [outputs, setRFNodes]);

  useEffect(() => {
    setRFNodes((prev) =>
      prev.map((n) => ({ ...n, data: { ...n.data, swapHighlighted: n.id === swapHoverTargetId } })),
    );
  }, [swapHoverTargetId, setRFNodes]);

  // Propagate global shift-key state into each node so they can style accordingly.
  useEffect(() => {
    setRFNodes((prev) =>
      prev.map((n) => ({ ...n, data: { ...n.data, shiftHeld } })),
    );
  }, [shiftHeld, setRFNodes]);

  // When the cascade-hover source changes, mark all descendants as deletePending.
  useEffect(() => {
    if (!cascadeHoverSourceId) {
      setRFNodes((prev) =>
        prev.map((n) => ({ ...n, data: { ...n.data, deletePending: false } })),
      );
      return;
    }
    const pendingIds = getDescendantIds(cascadeHoverSourceId, rfEdges);
    setRFNodes((prev) =>
      prev.map((n) => ({ ...n, data: { ...n.data, deletePending: pendingIds.has(n.id) } })),
    );
  }, [cascadeHoverSourceId, rfEdges, setRFNodes]);

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
        // Sync node removal to graph (Delete key) — primary input node cannot be removed.
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
    (_e: unknown, node: Node) => onSelectNode(node.id),
    [onSelectNode],
  );

  // Sync selection when a node is dragged without a prior click.
  const handleNodeDragStart = useCallback(
    (_e: unknown, node: Node) => onSelectNode(node.id),
    [onSelectNode],
  );

  const handlePaneClick = useCallback(() => onSelectNode(null), [onSelectNode]);

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
      const targetNode = rfNodes.find((n) => n.id === connection.target);
      const targetData = targetNode?.data as OpNodeData | undefined;
      // Displace any existing edge going to the same target/handle before adding the new one.
      const displaced = rfEdges.filter((e) => {
        if (e.target !== connection.target) return true;
        if (targetData?.multiInput) return e.targetHandle !== connection.targetHandle;
        return false;
      });
      const newEdges = addEdge(connection, displaced);
      setRFEdges(newEdges);
      const newGraph = flowToGraph(rfNodes, newEdges);
      prevGraphRef.current = newGraph;
      onGraphChange(newGraph);
    },
    [setRFEdges, rfEdges, rfNodes, graph, onGraphChange],
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      const targetNode = rfNodes.find((n) => n.id === newConnection.target);
      const targetData = targetNode?.data as OpNodeData | undefined;
      // Displace any existing edge on the new target/handle (other than the edge being moved).
      const displaced = rfEdges.filter((e) => {
        if (e.id === oldEdge.id) return true;
        if (e.target !== newConnection.target) return true;
        if (targetData?.multiInput) return e.targetHandle !== newConnection.targetHandle;
        return false;
      });
      const newEdges = reconnectEdge(oldEdge, newConnection, displaced);
      setRFEdges(newEdges);
      const newGraph = flowToGraph(rfNodes, newEdges);
      prevGraphRef.current = newGraph;
      onGraphChange(newGraph);
    },
    [rfEdges, rfNodes, onGraphChange, setRFEdges],
  );

  const onReconnectEnd = useCallback(
    (_event: unknown, edge: Edge, _handleType: unknown, connectionState: { isValid: boolean | null }) => {
      if (!connectionState.isValid) {
        // Edge was dropped in empty space — remove it.
        const newEdges = rfEdges.filter((e) => e.id !== edge.id);
        setRFEdges(newEdges);
        const newGraph = flowToGraph(rfNodes, newEdges);
        prevGraphRef.current = newGraph;
        onGraphChange(newGraph);
      }
    },
    [rfEdges, rfNodes, onGraphChange, setRFEdges],
  );

  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      // Input nodes cannot be connection targets.
      const targetNode = rfNodes.find((n) => n.id === connection.target);
      if (targetNode?.type === "pipeline-input") return false;
      // No self-loops.
      if (connection.source === connection.target) return false;
      return true;
    },
    [rfNodes],
  );

  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onReconnectEnd={onReconnectEnd}
        isValidConnection={isValidConnection}
        onNodeClick={handleNodeClick}
        onNodeDragStart={handleNodeDragStart}
        onPaneClick={handlePaneClick}
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
