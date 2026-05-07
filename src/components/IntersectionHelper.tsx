"use client";

import { useReactFlow } from "@xyflow/react";

export type Position = { x: number; y: number };

/**
 * Callback for finding an unoccupied canvas position before placing a new node.
 *
 * @param pos - Starting candidate position.
 * @param nudgeRight - When true, steps horizontally; otherwise steps vertically.
 * @returns The first candidate in the nudge sequence with no intersecting nodes.
 */
export type FindFreePosition = (pos: Position, nudgeRight: boolean) => Position;

// Estimated op-node bounding box used for intersection checks (matches PipelineOpNode styles).
export const NODE_W = 280;
export const NODE_H = 120;

// Step sizes are multiples of 50 to stay aligned with the snap grid.
const NUDGE_STEP_X = 350;
const NUDGE_STEP_Y = 150;

/**
 * A render-null component that lives inside `<ReactFlow>` and writes a
 * `findFreePosition` function into the provided ref on every render.
 *
 * This pattern is necessary because `useReactFlow` can only be called inside a
 * descendant of the `ReactFlow` provider, but the position-finding logic needs
 * to run in the parent component before a new node is added to the graph.
 */
export function IntersectionHelper({
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
      candidate = nudgeRight
        ? { ...candidate, x: candidate.x + NUDGE_STEP_X }
        : { ...candidate, y: candidate.y + NUDGE_STEP_Y };
    }
    return candidate;
  };

  return null;
}
