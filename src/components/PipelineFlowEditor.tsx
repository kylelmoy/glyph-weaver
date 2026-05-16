"use client";

/**
 * PipelineFlowEditor — React Flow canvas for the Glyph Weaver pipeline.
 *
 * Responsibilities:
 *  - Sync an abstract `PipelineGraph` ↔ React Flow nodes/edges state.
 *  - Handle canvas interactions: drag, connect, reconnect, delete, select.
 *  - Propagate global Shift-key state into node data for delete-preview styling.
 *  - Inject computed output text into output/tap node data.
 *
 * Conversion utilities (graphToFlow / flowToGraph) live in flowConversions.ts.
 * The IntersectionHelper (findFreePosition ref) lives in IntersectionHelper.tsx.
 */

import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  addEdge,
  reconnectEdge,
  useEdgesState,
  useNodesState,
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
import { IntersectionHelper } from "@/components/IntersectionHelper";
import type { FindFreePosition } from "@/components/IntersectionHelper";
import { PipelineInputNode } from "@/components/PipelineInputNode";
import { PipelineOpNode } from "@/components/PipelineOpNode";
import type { OpNodeData } from "@/components/PipelineOpNode";
import { PipelineOutputNode } from "@/components/PipelineOutputNode";
import { flowToGraph, getDescendantIds, graphToFlow } from "@/lib/flowConversions";
import type { GraphToFlowCallbacks } from "@/lib/flowConversions";
import type { GraphOutput, PipelineGraph } from "@/lib/pipelineGraph";
import { INPUT_NODE_ID } from "@/lib/pipelineGraph";
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

// ── Component ─────────────────────────────────────────────────────────────────

interface PipelineFlowEditorProps {
  graph: PipelineGraph;
  onGraphChange: (graph: PipelineGraph) => void;
  onUpdateParam: (nodeId: string, key: string, value: string) => void;
  onRemoveNode: (nodeId: string) => void;
  onSwapWithParent: (nodeId: string) => void;
  onSwapWithChild: (nodeId: string) => void;
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
    const down = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShiftHeld(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShiftHeld(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Compute initial RF state once; the sync effect handles all subsequent updates.
  const initialFlowRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);
  if (!initialFlowRef.current) {
    initialFlowRef.current = graphToFlow(
      graph,
      {
        onUpdateParam,
        onRemoveNode,
        onSwapWithParent,
        onSwapWithChild,
        onSwapHover: setSwapHoverTargetId,
        onCascadeHover: setCascadeHoverSourceId,
        onRemoveCascadeNode,
      } satisfies GraphToFlowCallbacks,
      selectedNodeId,
    );
  }

  const [rfNodes, setRFNodes, onRFNodesChange] = useNodesState<Node>(initialFlowRef.current.nodes);
  const [rfEdges, setRFEdges, onRFEdgesChange] = useEdgesState(initialFlowRef.current.edges);

  const prevGraphRef = useRef(graph);

  // Sync graph → RF when graph changes externally (e.g., palette adds a node).
  useEffect(() => {
    if (prevGraphRef.current === graph) return;
    prevGraphRef.current = graph;
    const { nodes, edges } = graphToFlow(
      graph,
      {
        onUpdateParam,
        onRemoveNode,
        onSwapWithParent,
        onSwapWithChild,
        onSwapHover: setSwapHoverTargetId,
        onCascadeHover: setCascadeHoverSourceId,
        onRemoveCascadeNode,
      },
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
    selectedNodeId,
    setRFNodes,
    setRFEdges,
    onRemoveCascadeNode,
  ]);

  // Sync output text, swap highlight, shift-key, and cascade-delete preview into node
  // data in one pass to avoid four separate React re-renders.
  useEffect(() => {
    const textById = new Map(outputs.map((o) => [o.id, o.text]));
    const pendingIds = cascadeHoverSourceId
      ? getDescendantIds(cascadeHoverSourceId, rfEdges)
      : null;
    setRFNodes((prev) =>
      prev.map((n) => ({
        ...n,
        data: {
          ...n.data,
          ...(n.type === "pipeline-output" ? { text: textById.get(n.id) ?? "" } : {}),
          swapHighlighted: n.id === swapHoverTargetId,
          shiftHeld,
          deletePending: pendingIds !== null && pendingIds.has(n.id),
        },
      })),
    );
  }, [outputs, swapHoverTargetId, shiftHeld, cascadeHoverSourceId, rfEdges, setRFNodes]);

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
        // Bridge incoming → outgoing edges to keep downstream nodes connected.
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
    (
      _event: unknown,
      edge: Edge,
      _handleType: unknown,
      connectionState: { isValid: boolean | null },
    ) => {
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
        snapToGrid
        snapGrid={[50, 50]}
      >
        <Background variant={BackgroundVariant.Dots} gap={25} />
        <Controls />
        <IntersectionHelper findFreePositionRef={findFreePositionRef} />
      </ReactFlow>
    </div>
  );
}
