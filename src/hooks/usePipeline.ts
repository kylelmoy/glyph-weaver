"use client";

/**
 * usePipeline — encapsulates all pipeline state and localStorage persistence.
 *
 * Manages the active pipeline (operations + params), the named-save workflow,
 * and the list of previously saved pipelines. The page component only needs
 * to call this hook and wire the returned values to its JSX.
 */

import { useState, useRef, useEffect } from "react";
import { OPERATIONS } from "@/lib/textOperations";
import type { PipelineItem, SavedPipeline } from "@/lib/textOperations";

const STORAGE_KEY = "glyph-weaver-pipelines";

export function usePipeline() {
  const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
  const [pipelineName, setPipelineName] = useState("");
  const [savedPipelines, setSavedPipelines] = useState<SavedPipeline[]>([]);
  const [showSaved, setShowSaved] = useState(false);

  // Monotonically increasing counter; stored in a ref so increments don't
  // trigger re-renders. Each new PipelineItem gets a unique string ID.
  const nextId = useRef(0);

  // Load persisted pipelines once on mount.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSavedPipelines(JSON.parse(stored) as SavedPipeline[]);
    } catch {
      // Ignore malformed storage data rather than crashing.
    }
  }, []);

  /** Sync updated list to both React state and localStorage. */
  function persist(updated: SavedPipeline[]) {
    setSavedPipelines(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  /** Append a new operation instance (with blank params) to the pipeline. */
  function addOperation(operationId: string) {
    const op = OPERATIONS.find((o) => o.id === operationId);
    const params: Record<string, string> = {};
    for (const p of op?.params ?? []) params[p.key] = "";
    setPipeline((prev) => [
      ...prev,
      { instanceId: String(nextId.current++), operationId, params },
    ]);
  }

  /** Update a single parameter value for an existing operation instance. */
  function updateParam(instanceId: string, key: string, value: string) {
    setPipeline((prev) =>
      prev.map((item) =>
        item.instanceId === instanceId
          ? { ...item, params: { ...item.params, [key]: value } }
          : item,
      ),
    );
  }

  /** Remove an operation instance from the pipeline by its instanceId. */
  function removeOperation(instanceId: string) {
    setPipeline((prev) => prev.filter((item) => item.instanceId !== instanceId));
  }

  /** Swap the operation at `index` with its neighbor in the given direction. */
  function moveOperation(index: number, direction: "up" | "down") {
    setPipeline((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  /**
   * Save the current pipeline under `pipelineName`.
   * Overwrites an existing entry with the same name; otherwise appends.
   * Falls back to "Untitled" when the name field is blank.
   */
  function savePipeline() {
    const name = pipelineName.trim() || "Untitled";
    const entry: SavedPipeline = {
      id: String(Date.now()),
      name,
      savedAt: Date.now(),
      pipeline,
    };
    const idx = savedPipelines.findIndex((s) => s.name === name);
    persist(
      idx >= 0
        ? savedPipelines.map((s, i) => (i === idx ? entry : s))
        : [...savedPipelines, entry],
    );
  }

  /** Restore the pipeline to a previously saved snapshot. */
  function loadPipeline(saved: SavedPipeline) {
    setPipeline(saved.pipeline);
    setPipelineName(saved.name);
    // Advance the counter past IDs already used by the loaded pipeline
    // to prevent collisions if the user adds more operations afterward.
    nextId.current =
      saved.pipeline.reduce(
        (max, item) => Math.max(max, Number(item.instanceId)),
        -1,
      ) + 1;
  }

  /** Permanently remove a saved pipeline by ID. */
  function deleteSavedPipeline(id: string) {
    persist(savedPipelines.filter((s) => s.id !== id));
  }

  return {
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
    savePipeline,
    loadPipeline,
    deleteSavedPipeline,
  };
}
