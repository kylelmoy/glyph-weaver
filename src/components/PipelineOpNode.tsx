"use client";

import { OPERATIONS } from "@/lib/operations";
import { Column, IconButton, Input, Row, Text } from "@once-ui-system/core";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { useEffect, useState } from "react";

export interface OpNodeData extends Record<string, unknown> {
  operationId: string;
  params: Record<string, string>;
  onUpdateParam: (key: string, value: string) => void;
  onRemove: () => void;
  onRemoveCascade: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSwapHover: (nodeId: string | null) => void;
  /** Signal to the editor that this node's remove button is shift-hovered. */
  onCascadeHover: (nodeId: string | null) => void;
  swapUpTargetId?: string;
  swapDownTargetId?: string;
  highlighted?: boolean;
  swapHighlighted?: boolean;
  /** True when shift is held globally — passed from PipelineFlowEditor. */
  shiftHeld?: boolean;
  /** True when this node is in the cascade-delete preview set. */
  deletePending?: boolean;
}

/**
 * React Flow node for a single pipeline operation — shows the operation name,
 * configurable parameter inputs, and move-up / move-down / remove controls.
 */
export function PipelineOpNode({ id, data, selected }: NodeProps) {
  const nodeData = data as OpNodeData;
  const op = OPERATIONS.find((o) => o.id === nodeData.operationId);
  if (!op) return null;

  const [removeHovered, setRemoveHovered] = useState(false);

  // When the shift key is toggled while the remove button is already hovered,
  // update the cascade-hover state to reflect the new shift state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!removeHovered) return;
    nodeData.onCascadeHover(nodeData.shiftHeld ? id : null);
  }, [nodeData.shiftHeld]); // onCascadeHover is a stable state setter; id is stable

  const handleRemoveEnter = () => {
    setRemoveHovered(true);
    if (nodeData.shiftHeld) nodeData.onCascadeHover(id);
  };

  const handleRemoveLeave = () => {
    setRemoveHovered(false);
    nodeData.onCascadeHover(null);
  };

  const handleRemoveClick = () => {
    if (nodeData.shiftHeld) nodeData.onRemoveCascade();
    else nodeData.onRemove();
  };

  const isDeletable = !!nodeData.deletePending;
  const isHighlighted = !isDeletable && (!!nodeData.highlighted || !!nodeData.swapHighlighted);

  const borderColor = isDeletable
    ? "var(--danger-solid-strong)"
    : selected || isHighlighted
      ? "var(--brand-solid-strong)"
      : "var(--neutral-alpha-medium)";

  const background = isDeletable
    ? "var(--danger-alpha-weak)"
    : isHighlighted
      ? "var(--accent-alpha-weak)"
      : "var(--background-page)";

  return (
    <div
      style={{
        background,
        border: `2px solid ${borderColor}`,
        transition: "background 0.15s, border-color 0.15s",
        borderRadius: "var(--radius-m)",
        minWidth: 200,
        maxWidth: 280,
      }}
    >
      <Handle type="target" position={Position.Top} isConnectableStart={false} />

      <Column gap="xs" padding="s">
        <Row gap="s" vertical="center" horizontal="between">
          <Text variant="label-strong-s" title={op.description}>
            {op.name}
          </Text>
          <Row gap="2">
            {nodeData.canMoveUp && (
              <span
                onMouseEnter={() => nodeData.onSwapHover(nodeData.swapUpTargetId ?? null)}
                onMouseLeave={() => nodeData.onSwapHover(null)}
              >
                <IconButton
                  icon="chevronUp"
                  size="s"
                  variant="ghost"
                  tooltip="Move earlier"
                  onClick={nodeData.onMoveUp}
                />
              </span>
            )}
            {nodeData.canMoveDown && (
              <span
                onMouseEnter={() => nodeData.onSwapHover(nodeData.swapDownTargetId ?? null)}
                onMouseLeave={() => nodeData.onSwapHover(null)}
              >
                <IconButton
                  icon="chevronDown"
                  size="s"
                  variant="ghost"
                  tooltip="Move later"
                  onClick={nodeData.onMoveDown}
                />
              </span>
            )}
            <span onMouseEnter={handleRemoveEnter} onMouseLeave={handleRemoveLeave}>
              <IconButton
                icon="close"
                size="s"
                variant="ghost"
                tooltip={nodeData.shiftHeld ? "Remove with all downstream" : "Remove (shift to remove all)"}
                onClick={handleRemoveClick}
              />
            </span>
          </Row>
        </Row>

        {op.params?.map((param) => (
          <Input
            key={param.key}
            id={`${id}-${param.key}`}
            label={param.label}
            placeholder={param.placeholder}
            value={nodeData.params[param.key] ?? ""}
            onChange={(e) => nodeData.onUpdateParam(param.key, e.target.value)}
            height="s"
            className="nodrag"
            style={param.monospace ? { fontFamily: "monospace" } : undefined}
          />
        ))}
      </Column>

      <Handle type="source" position={Position.Bottom} isConnectableStart={false} />
    </div>
  );
}
