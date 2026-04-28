"use client";

import {
  graphToLinearItems,
  isSavedPipelineV2,
  linearItemsToGraph,
  migrateSavedPipeline,
} from "@/lib/pipelineGraph";
import type {
  AnyPersistedPipeline,
  PipelineEdge,
  PipelineGraph,
  PipelineNode,
  SavedPipelineV2,
} from "@/lib/pipelineGraph";
import { OPERATIONS } from "@/lib/textOperations";
import type { PipelineItem } from "@/lib/textOperations";
import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "glyph-weaver-pipelines";

export function usePipeline() {
  const [graph, setGraph] = useState<PipelineGraph>({ nodes: [], edges: [] });
  const [pipelineName, setPipelineName] = useState("");
  const [savedPipelines, setSavedPipelines] = useState<AnyPersistedPipeline[]>([]);
  const [showSaved, setShowSaved] = useState(false);

  const nextId = useRef(0);

  // Derived linear view for the list UI — recomputed whenever graph changes.
  const pipeline: PipelineItem[] = useMemo(() => graphToLinearItems(graph), [graph]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const raw = JSON.parse(stored) as AnyPersistedPipeline[];
      // Eagerly migrate any v1 entries to v2 and write back so future loads are clean.
      const migrated = raw.map((entry) =>
        isSavedPipelineV2(entry) ? entry : migrateSavedPipeline(entry),
      );
      setSavedPipelines(migrated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    } catch {
      // Ignore malformed storage data.
    }
  }, []);

  function persist(updated: AnyPersistedPipeline[]) {
    setSavedPipelines(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  /**
   * Append a new operation as the next node in the main chain.
   * Finds the current leaf (no outgoing edges), adds the new node below it,
   * and connects them with an edge.
   */
  function addOperation(operationId: string) {
    const op = OPERATIONS.find((o) => o.id === operationId);
    const params: Record<string, string> = {};
    for (const p of op?.params ?? []) params[p.key] = "";

    const newId = String(nextId.current++);

    setGraph((prev) => {
      const targetIds = new Set(prev.edges.map((e) => e.target));
      const leaf = prev.nodes.find((n) => !targetIds.has(n.id));
      const maxY = prev.nodes.reduce((m, n) => Math.max(m, n.position.y), -120);

      const newNode: PipelineNode = {
        id: newId,
        operationId,
        params,
        position: { x: 200, y: maxY + 120 },
      };

      const newEdge: PipelineEdge | null = leaf
        ? { id: `e-${leaf.id}-${newId}`, source: leaf.id, target: newId }
        : null;

      return {
        nodes: [...prev.nodes, newNode],
        edges: newEdge ? [...prev.edges, newEdge] : prev.edges,
      };
    });
  }

  function updateParam(instanceId: string, key: string, value: string) {
    setGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === instanceId ? { ...n, params: { ...n.params, [key]: value } } : n,
      ),
    }));
  }

  /**
   * Remove a node and its edges. If the removed node had both a parent and a
   * child in the chain, bridge them so the chain stays connected.
   */
  function removeOperation(instanceId: string) {
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

  /**
   * Reorder in list view: flatten to items, swap, rebuild as a chain.
   * Only meaningful when the graph is a single linear chain.
   */
  function moveOperation(index: number, direction: "up" | "down") {
    setGraph((prev) => {
      const items = graphToLinearItems(prev);
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= items.length) return prev;
      const next = [...items];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return linearItemsToGraph(next);
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

  function loadPipeline(saved: AnyPersistedPipeline) {
    const v2 = isSavedPipelineV2(saved) ? saved : migrateSavedPipeline(saved);
    setGraph(v2.graph);
    setPipelineName(v2.name);
    nextId.current = v2.graph.nodes.reduce((max, node) => Math.max(max, Number(node.id)), -1) + 1;
  }

  function deleteSavedPipeline(id: string) {
    persist(savedPipelines.filter((s) => s.id !== id));
  }

  return {
    graph,
    setGraph,
    pipeline,
    pipelineName,
    setPipelineName,
    savedPipelines,
    showSaved,
    setShowSaved,
    addOperation,
    updateParam,
    removeOperation,
    moveOperation,
    updateNodePosition,
    addGraphEdge,
    removeGraphEdge,
    savePipeline,
    loadPipeline,
    deleteSavedPipeline,
  };
}
