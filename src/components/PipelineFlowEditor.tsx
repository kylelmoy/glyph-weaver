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
import { PipelineOpNode } from "@/components/PipelineOpNode";
import type { OpNodeData } from "@/components/PipelineOpNode";
import type { PipelineGraph } from "@/lib/pipelineGraph";
import { OPERATIONS } from "@/lib/textOperations";
import { useCallback, useEffect, useRef } from "react";

// Define node types outside the component so React Flow doesn't remount nodes on re-render.
const NODE_TYPES = { op: PipelineOpNode };

export type OpNode = Node<OpNodeData, "op">;

// ── Conversion helpers ────────────────────────────────────────────────────────

function graphToFlow(
  graph: PipelineGraph,
  onUpdateParam: (nodeId: string, key: string, value: string) => void,
  onRemoveNode: (nodeId: string) => void,
): { nodes: OpNode[]; edges: Edge[] } {
  const nodes: OpNode[] = graph.nodes.map((n) => {
    const op = OPERATIONS.find((o) => o.id === n.operationId);
    return {
      id: n.id,
      type: "op" as const,
      position: n.position,
      data: {
        operationId: n.operationId,
        params: n.params,
        onUpdateParam: (key: string, value: string) => onUpdateParam(n.id, key, value),
        onRemove: () => onRemoveNode(n.id),
      },
      // Pass op name as aria label for accessibility
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

function flowToGraph(
  rfNodes: Node[],
  rfEdges: Edge[],
  originalGraph: PipelineGraph,
): PipelineGraph {
  return {
    nodes: rfNodes.map((n) => ({
      id: n.id,
      operationId: (n.data as OpNodeData).operationId,
      params: (n.data as OpNodeData).params,
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
}

export function PipelineFlowEditor({
  graph,
  onGraphChange,
  onUpdateParam,
  onRemoveNode,
}: PipelineFlowEditorProps) {
  const { nodes: initialNodes, edges: initialEdges } = graphToFlow(
    graph,
    onUpdateParam,
    onRemoveNode,
  );

  const [rfNodes, setRFNodes, onRFNodesChange] = useNodesState<Node>(initialNodes as Node[]);
  const [rfEdges, setRFEdges, onRFEdgesChange] = useEdgesState(initialEdges);

  // Track the last graph that RF state was synced FROM to avoid feedback loops.
  const prevGraphRef = useRef(graph);

  // Sync graph → RF when graph changes externally (e.g., palette adds a node).
  useEffect(() => {
    if (prevGraphRef.current === graph) return;
    prevGraphRef.current = graph;
    const { nodes, edges } = graphToFlow(graph, onUpdateParam, onRemoveNode);
    setRFNodes(nodes);
    setRFEdges(edges);
  }, [graph, onUpdateParam, onRemoveNode, setRFNodes, setRFEdges]);

  const handleNodesChange: OnNodesChange<Node> = useCallback(
    (changes) => {
      onRFNodesChange(changes);
      setRFNodes((currentNodes) => {
        for (const change of changes) {
          // Sync final drag position to graph (not during drag, to avoid excessive updates).
          if (change.type === "position" && !change.dragging && change.position) {
            const newGraph = flowToGraph(currentNodes, rfEdges, graph);
            prevGraphRef.current = newGraph;
            onGraphChange(newGraph);
            break;
          }
          // Sync node removal to graph.
          if (change.type === "remove") {
            const newGraph = flowToGraph(
              currentNodes.filter((n) => n.id !== change.id),
              rfEdges,
              graph,
            );
            prevGraphRef.current = newGraph;
            onGraphChange(newGraph);
            break;
          }
        }
        return currentNodes;
      });
    },
    [onRFNodesChange, setRFNodes, rfEdges, graph, onGraphChange],
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onRFEdgesChange(changes);
      setRFEdges((currentEdges) => {
        for (const change of changes) {
          if (change.type === "remove") {
            const newGraph = flowToGraph(rfNodes, currentEdges, graph);
            prevGraphRef.current = newGraph;
            onGraphChange(newGraph);
            break;
          }
        }
        return currentEdges;
      });
    },
    [onRFEdgesChange, setRFEdges, rfNodes, graph, onGraphChange],
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      setRFEdges((currentEdges) => {
        const newEdges = addEdge(connection, currentEdges);
        const newGraph = flowToGraph(rfNodes, newEdges, graph);
        prevGraphRef.current = newGraph;
        onGraphChange(newGraph);
        return newEdges;
      });
    },
    [setRFEdges, rfNodes, graph, onGraphChange],
  );

  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      // Each node may only have one incoming edge (diverging only, not converging).
      const targetAlreadyHasParent = rfEdges.some((e) => e.target === connection.target);
      return !targetAlreadyHasParent && connection.source !== connection.target;
    },
    [rfEdges],
  );

  return (
    <div style={{ width: "100%", height: 500, borderRadius: 8, overflow: "hidden" }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        nodeTypes={NODE_TYPES}
        fitView
        deleteKeyCode="Delete"
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
