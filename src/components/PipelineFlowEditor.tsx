"use client";

import {
  Background,
  Controls,
  ReactFlow,
  addEdge,
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
import { PipelineInputNode } from "@/components/PipelineInputNode";
import { PipelineOpNode } from "@/components/PipelineOpNode";
import type { OpNodeData } from "@/components/PipelineOpNode";
import type { PipelineGraph } from "@/lib/pipelineGraph";
import { INPUT_NODE_ID } from "@/lib/pipelineGraph";
import { OPERATIONS } from "@/lib/textOperations";
import { useTheme } from "@once-ui-system/core";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";

// Define node types outside the component so React Flow doesn't remount nodes on re-render.
const NODE_TYPES = { op: PipelineOpNode, "pipeline-input": PipelineInputNode };

/** Walk backwards from a leaf to collect every ancestor node ID and edge ID. */
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

function graphToFlow(
  graph: PipelineGraph,
  onUpdateParam: (nodeId: string, key: string, value: string) => void,
  onRemoveNode: (nodeId: string) => void,
  selectedNodeId: string | null,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = graph.nodes.map((n) => {
    if (n.id === INPUT_NODE_ID) {
      return {
        id: n.id,
        type: "pipeline-input" as const,
        position: n.position,
        selected: n.id === selectedNodeId,
        deletable: false,
        data: {},
      };
    }
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

// ── Component ─────────────────────────────────────────────────────────────────

interface PipelineFlowEditorProps {
  graph: PipelineGraph;
  onGraphChange: (graph: PipelineGraph) => void;
  onUpdateParam: (nodeId: string, key: string, value: string) => void;
  onRemoveNode: (nodeId: string) => void;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onHoverLeafNode: (id: string | null) => void;
  hoveredOutputId: string | null;
}

export function PipelineFlowEditor({
  graph,
  onGraphChange,
  onUpdateParam,
  onRemoveNode,
  selectedNodeId,
  onSelectNode,
  onHoverLeafNode,
  hoveredOutputId,
}: PipelineFlowEditorProps) {
  const { theme } = useTheme();
  const [colorMode, setColorMode] = useState<"light" | "dark">("light");
  useEffect(() => {
    setColorMode(
      (document.documentElement.getAttribute("data-theme") as "light" | "dark") ?? "light",
    );
  }, [theme]);

  const { nodes: initialNodes, edges: initialEdges } = graphToFlow(
    graph,
    onUpdateParam,
    onRemoveNode,
    selectedNodeId,
  );

  const [rfNodes, setRFNodes, onRFNodesChange] = useNodesState<Node>(initialNodes);
  const [rfEdges, setRFEdges, onRFEdgesChange] = useEdgesState(initialEdges);

  // Track the last graph that RF state was synced FROM to avoid feedback loops.
  const prevGraphRef = useRef(graph);

  // Sync graph → RF when graph changes externally (e.g., palette adds a node).
  useEffect(() => {
    if (prevGraphRef.current === graph) return;
    prevGraphRef.current = graph;
    const { nodes, edges } = graphToFlow(graph, onUpdateParam, onRemoveNode, selectedNodeId);
    setRFNodes(nodes);
    setRFEdges(edges);
  }, [graph, onUpdateParam, onRemoveNode, selectedNodeId, setRFNodes, setRFEdges]);

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
        animated: edgeIds.has(e.id)
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
          const newGraph = flowToGraph(
            rfNodes.filter((n) => n.id !== change.id),
            rfEdges,
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
          const newGraph = flowToGraph(rfNodes, rfEdges.filter((e) => e.id !== change.id));
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
      </ReactFlow>
    </div>
  );
}
