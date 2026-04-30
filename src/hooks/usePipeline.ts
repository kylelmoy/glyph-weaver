"use client";

import type {
  PipelineEdge,
  PipelineGraph,
  PipelineNode,
  SavedPipelineV2,
} from "@/lib/pipelineGraph";
import { INPUT_NODE_ID } from "@/lib/pipelineGraph";
import { OPERATIONS } from "@/lib/textOperations";
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "glyph-weaver-pipelines";

const INITIAL_INPUT_NODE: PipelineNode = {
  id: INPUT_NODE_ID,
  operationId: INPUT_NODE_ID,
  params: {},
  position: { x: 0, y: 0 },
};

export function usePipeline() {
  const [graph, setGraph] = useState<PipelineGraph>({
    nodes: [INITIAL_INPUT_NODE],
    edges: [],
  });
  const [pipelineName, setPipelineName] = useState("");
  const [savedPipelines, setSavedPipelines] = useState<SavedPipelineV2[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const nextId = useRef(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const raw = JSON.parse(stored) as SavedPipelineV2[];
      setSavedPipelines(raw);
    } catch {
      // Ignore malformed storage data.
    }
  }, []);

  function persist(updated: SavedPipelineV2[]) {
    setSavedPipelines(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function addOperation(operationId: string) {
    const op = OPERATIONS.find((o) => o.id === operationId);
    const params: Record<string, string> = {};
    for (const p of op?.params ?? []) params[p.key] = "";

    const newId = String(nextId.current++);
    // Default parent is the selected node, or the input node if nothing is selected.
    const parentId = selectedNodeId ?? INPUT_NODE_ID;

    setGraph((prev) => {
      const parent =
        prev.nodes.find((n) => n.id === parentId) ??
        prev.nodes.find((n) => n.id === INPUT_NODE_ID)!;

      // Offset horizontally for each existing child so siblings don't overlap.
      const siblingCount = prev.edges.filter((e) => e.source === parent.id).length;
      const position = {
        x: parent.position.x + siblingCount * 240,
        y: parent.position.y + 130,
      };

      const newNode: PipelineNode = { id: newId, operationId, params, position };
      const newEdge: PipelineEdge = {
        id: `e-${parent.id}-${newId}`,
        source: parent.id,
        target: newId,
      };

      return {
        nodes: [...prev.nodes, newNode],
        edges: [...prev.edges, newEdge],
      };
    });

    setSelectedNodeId(newId);
  }

  function updateParam(instanceId: string, key: string, value: string) {
    setGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === instanceId ? { ...n, params: { ...n.params, [key]: value } } : n,
      ),
    }));
  }

  function removeOperation(instanceId: string) {
    if (instanceId === INPUT_NODE_ID) return;
    if (selectedNodeId === instanceId) setSelectedNodeId(null);
    setGraph((prev) => {
      const inEdge = prev.edges.find((e) => e.target === instanceId);
      const outEdge = prev.edges.find((e) => e.source === instanceId);
      const remaining = prev.edges.filter(
        (e) => e.source !== instanceId && e.target !== instanceId,
      );
      if (inEdge && outEdge) {
        remaining.push({
          id: `e-${inEdge.source}-${outEdge.target}`,
          source: inEdge.source,
          target: outEdge.target,
        });
      }
      return {
        nodes: prev.nodes.filter((n) => n.id !== instanceId),
        edges: remaining,
      };
    });
  }

  function updateNodePosition(nodeId: string, position: { x: number; y: number }) {
    setGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, position } : n)),
    }));
  }

  function addGraphEdge(source: string, target: string) {
    const id = `e-${source}-${target}-${Date.now()}`;
    setGraph((prev) => ({
      ...prev,
      edges: [...prev.edges, { id, source, target }],
    }));
  }

  function removeGraphEdge(edgeId: string) {
    setGraph((prev) => ({
      ...prev,
      edges: prev.edges.filter((e) => e.id !== edgeId),
    }));
  }

  function savePipeline() {
    const name = pipelineName.trim() || "Untitled";
    const entry: SavedPipelineV2 = {
      id: String(Date.now()),
      name,
      savedAt: Date.now(),
      version: 2,
      graph,
    };
    const idx = savedPipelines.findIndex((s) => s.name === name);
    persist(
      idx >= 0 ? savedPipelines.map((s, i) => (i === idx ? entry : s)) : [...savedPipelines, entry],
    );
  }

  function loadPipeline(saved: SavedPipelineV2) {
    setSelectedNodeId(null);
    let g = saved.graph;
    // Migrate graphs saved before the input node existed.
    if (!g.nodes.some((n) => n.id === INPUT_NODE_ID)) {
      const targetIds = new Set(g.edges.map((e) => e.target));
      const rootIds = g.nodes.filter((n) => !targetIds.has(n.id)).map((n) => n.id);
      g = {
        nodes: [INITIAL_INPUT_NODE, ...g.nodes],
        edges: [
          ...g.edges,
          ...rootIds.map((id) => ({
            id: `e-${INPUT_NODE_ID}-${id}`,
            source: INPUT_NODE_ID,
            target: id,
          })),
        ],
      };
    }
    setGraph(g);
    setPipelineName(saved.name);
    nextId.current =
      g.nodes.reduce((max, node) => {
        const n = Number(node.id);
        return Number.isFinite(n) ? Math.max(max, n) : max;
      }, -1) + 1;
  }

  function deleteSavedPipeline(id: string) {
    persist(savedPipelines.filter((s) => s.id !== id));
  }

  return {
    graph,
    setGraph,
    selectedNodeId,
    setSelectedNodeId,
    pipelineName,
    setPipelineName,
    savedPipelines,
    showSaved,
    setShowSaved,
    addOperation,
    updateParam,
    removeOperation,
    updateNodePosition,
    addGraphEdge,
    removeGraphEdge,
    savePipeline,
    loadPipeline,
    deleteSavedPipeline,
  };
}
