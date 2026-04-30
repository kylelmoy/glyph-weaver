"use client";

import { OPERATIONS } from "@/lib/textOperations";
import { Column, IconButton, Input, Row, Text } from "@once-ui-system/core";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

export interface OpNodeData extends Record<string, unknown> {
  operationId: string;
  params: Record<string, string>;
  onUpdateParam: (key: string, value: string) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSwapHover: (nodeId: string | null) => void;
  swapUpTargetId?: string;
  swapDownTargetId?: string;
  highlighted?: boolean;
  swapHighlighted?: boolean;
}

export function PipelineOpNode({ id, data, selected }: NodeProps) {
  const nodeData = data as OpNodeData;
  const op = OPERATIONS.find((o) => o.id === nodeData.operationId);
  if (!op) return null;

  const isHighlighted = nodeData.highlighted || nodeData.swapHighlighted;

  return (
    <div
      style={{
        background: isHighlighted ? "var(--accent-alpha-weak)" : "var(--background-page)",
        border: `2px solid ${selected ? "var(--brand-solid-strong)" : "var(--neutral-alpha-medium)"}`,
        transition: "background 0.15s",
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
            <IconButton
              icon="close"
              size="s"
              variant="ghost"
              tooltip="Remove"
              onClick={nodeData.onRemove}
            />
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
