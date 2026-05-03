"use client";

/**
 * usePipeline — single source of truth for the active pipeline graph.
 *
 * Manages graph state (nodes, edges), parameter editing, node operations
 * (add, remove, reorder), and two-tier persistence:
 *  - Auto-save: the active graph is written to localStorage on every change.
 *  - Named saves: user-titled snapshots stored in a separate localStorage key.
 */

import type {
  PipelineEdge,
  PipelineGraph,
  PipelineNode,
  SavedPipelineV2,
} from "@/lib/pipelineGraph";
import { INPUT_NODE_ID } from "@/lib/pipelineGraph";
import { OPERATIONS } from "@/lib/operations";
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "glyph-weaver-pipelines";
const SESSION_KEY = "glyph-weaver-session";

// Vertical canvas spacing when placing a new node below its parent.
// INPUT_CHILD_Y_OFFSET is larger to account for the input node's textarea height.
const INPUT_CHILD_Y_OFFSET = 300;
const OP_CHILD_Y_OFFSET = 130;

const INITIAL_INPUT_NODE: PipelineNode = {
  id: INPUT_NODE_ID,
  operationId: INPUT_NODE_ID,
  params: {},
  position: { x: 0, y: 0 },
};

/**
 * Ensure the graph always contains the reserved input node.
 * If it is missing (e.g. after loading a legacy save), it is prepended and
 * connected to all existing root nodes (nodes with no incoming edges).
 */
function ensureInputNode(g: PipelineGraph): PipelineGraph {
  if (g.nodes.some((n) => n.id === INPUT_NODE_ID)) return g;
  const targetIds = new Set(g.edges.map((e) => e.target));
  const rootIds = g.nodes.filter((n) => !targetIds.has(n.id)).map((n) => n.id);
  return {
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

/**
 * Determine the next numeric node ID to use, derived from the graph.
 * Scans existing numeric IDs and returns max + 1, so IDs never collide
 * even after loading a saved pipeline with pre-existing nodes.
 */
function computeNextId(g: PipelineGraph): number {
  return (
    g.nodes.reduce((max, node) => {
      const n = Number(node.id);
      return Number.isFinite(n) ? Math.max(max, n) : max;
    }, -1) + 1
  );
}

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
  // Counts how many times the auto-save effect has fired.
  // We skip the very first firing to avoid overwriting a restored session with
  // the bare initial graph that exists before localStorage has been read.
  const sessionSaveCount = useRef(0);

  // Load saved pipelines list and restore the active session graph on mount.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSavedPipelines(JSON.parse(stored) as SavedPipelineV2[]);
    } catch {
      /* localStorage unavailable (e.g. private browsing or quota exceeded) */
    }

    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const { graph: savedGraph } = JSON.parse(stored) as { graph: PipelineGraph };
        const g = ensureInputNode(savedGraph);
        setGraph(g);
        nextId.current = computeNextId(g);
      }
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  // Auto-save the active graph to localStorage on every change.
  useEffect(() => {
    sessionSaveCount.current++;
    if (sessionSaveCount.current === 1) return; // skip initial render (see comment above)
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ graph }));
    } catch {
      /* localStorage unavailable or quota exceeded */
    }
  }, [graph]);

  /** Write the current saved-pipeline list to state and localStorage. */
  function persist(updated: SavedPipelineV2[]) {
    setSavedPipelines(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  /**
   * Add a new operation node to the graph, connected from the currently
   * selected node (or the input node if nothing is selected).
   *
   * @param operationId - ID of the operation from the OPERATIONS registry.
   * @param findFreePosition - Optional callback from the React Flow canvas that
   *   nudges the candidate position until it no longer overlaps existing nodes.
   */
  function addOperation(
    operationId: string,
    findFreePosition?: (pos: { x: number; y: number }, nudgeRight: boolean) => { x: number; y: number },
  ) {
    const op = OPERATIONS.find((o) => o.id === operationId);
    const params: Record<string, string> = {};
    for (const p of op?.params ?? []) params[p.key] = "";

    const newId = String(nextId.current++);
    const parentId = selectedNodeId ?? INPUT_NODE_ID;

    // Compute the default position using the current graph state (not inside
    // setGraph) so findFreePosition can be called synchronously before the update.
    const parent =
      graph.nodes.find((n) => n.id === parentId) ??
      graph.nodes.find((n) => n.id === INPUT_NODE_ID)!;

    const isInputParent = parent.id === INPUT_NODE_ID;
    let position = {
      x: parent.position.x,
      y: parent.position.y + (isInputParent ? INPUT_CHILD_Y_OFFSET : OP_CHILD_Y_OFFSET),
    };

    if (findFreePosition) {
      const parentHasChildren = graph.edges.some((e) => e.source === parentId);
      position = findFreePosition(position, parentHasChildren);
    }

    setGraph((prev) => {
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

  /** Update a single parameter value on an existing operation node. */
  function updateParam(instanceId: string, key: string, value: string) {
    setGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === instanceId ? { ...n, params: { ...n.params, [key]: value } } : n,
      ),
    }));
  }

  /**
   * Remove an operation node from the graph, re-bridging its incoming edge
   * to each of its outgoing edges so downstream nodes stay connected.
   */
  function removeOperation(instanceId: string) {
    if (instanceId === INPUT_NODE_ID) return;
    if (selectedNodeId === instanceId) setSelectedNodeId(null);
    setGraph((prev) => {
      const inEdge = prev.edges.find((e) => e.target === instanceId);
      const outEdges = prev.edges.filter((e) => e.source === instanceId);
      const remaining = prev.edges.filter(
        (e) => e.source !== instanceId && e.target !== instanceId,
      );
      if (inEdge) {
        for (const outEdge of outEdges) {
          remaining.push({
            id: `e-${inEdge.source}-${outEdge.target}`,
            source: inEdge.source,
            target: outEdge.target,
          });
        }
      }
      return {
        nodes: prev.nodes.filter((n) => n.id !== instanceId),
        edges: remaining,
      };
    });
  }

  /**
   * Remove a node and every one of its descendants from the graph.
   * Unlike `removeOperation`, no edge bridging is done — the entire downstream
   * subtree is discarded.
   */
  function removeCascade(startId: string) {
    if (startId === INPUT_NODE_ID) return;

    // BFS from startId, following outgoing edges, to collect all descendants.
    const toRemove = new Set<string>();
    const queue = [startId];
    while (queue.length > 0) {
      const id = queue.shift()!;
      toRemove.add(id);
      graph.edges.filter((e) => e.source === id).forEach((e) => {
        if (!toRemove.has(e.target)) queue.push(e.target);
      });
    }

    if (selectedNodeId && toRemove.has(selectedNodeId)) setSelectedNodeId(null);

    setGraph((prev) => ({
      nodes: prev.nodes.filter((n) => !toRemove.has(n.id)),
      edges: prev.edges.filter((e) => !toRemove.has(e.source) && !toRemove.has(e.target)),
    }));
  }

  /**
   * Swap the operation and parameters of a node with those of its parent,
   * effectively moving the node one step earlier in the pipeline.
   * Does nothing if the parent is the input node.
   */
  function swapWithParent(nodeId: string) {
    setGraph((prev) => {
      const parentEdge = prev.edges.find((e) => e.target === nodeId);
      if (!parentEdge || parentEdge.source === INPUT_NODE_ID) return prev;
      const parentId = parentEdge.source;
      const a = prev.nodes.find((n) => n.id === nodeId)!;
      const b = prev.nodes.find((n) => n.id === parentId)!;
      return {
        ...prev,
        nodes: prev.nodes.map((n) => {
          if (n.id === nodeId) return { ...n, operationId: b.operationId, params: b.params };
          if (n.id === parentId) return { ...n, operationId: a.operationId, params: a.params };
          return n;
        }),
      };
    });
  }

  /**
   * Swap the operation and parameters of a node with those of its single child,
   * effectively moving the node one step later in the pipeline.
   * Does nothing if the node has no children or more than one child.
   */
  function swapWithChild(nodeId: string) {
    setGraph((prev) => {
      const childEdge = prev.edges.find((e) => e.source === nodeId);
      if (!childEdge) return prev;
      const childId = childEdge.target;
      const a = prev.nodes.find((n) => n.id === nodeId)!;
      const b = prev.nodes.find((n) => n.id === childId)!;
      return {
        ...prev,
        nodes: prev.nodes.map((n) => {
          if (n.id === nodeId) return { ...n, operationId: b.operationId, params: b.params };
          if (n.id === childId) return { ...n, operationId: a.operationId, params: a.params };
          return n;
        }),
      };
    });
  }

  /**
   * Save the current graph under `pipelineName`, overwriting any existing
   * save with the same name. Falls back to "Untitled" if the name is blank.
   */
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

  /** Replace the active graph with a saved pipeline snapshot. */
  function loadPipeline(saved: SavedPipelineV2) {
    setSelectedNodeId(null);
    const g = ensureInputNode(saved.graph);
    setGraph(g);
    setPipelineName(saved.name);
    nextId.current = computeNextId(g);
  }

  /** Permanently delete a named save by ID. */
  function deleteSavedPipeline(id: string) {
    persist(savedPipelines.filter((s) => s.id !== id));
  }

  /** Reset the active graph to its initial state and clear the session. */
  function reset() {
    setGraph({ nodes: [INITIAL_INPUT_NODE], edges: [] });
    setPipelineName("");
    setSelectedNodeId(null);
    nextId.current = 0;
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* localStorage unavailable */
    }
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
    savePipeline,
    loadPipeline,
    deleteSavedPipeline,
    swapWithParent,
    swapWithChild,
    removeCascade,
    reset,
  };
}
