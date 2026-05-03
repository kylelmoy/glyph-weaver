"use client";

import { Column, IconButton, Input, Row, Text } from "@once-ui-system/core";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

export interface OutputNodeData extends Record<string, unknown> {
  params: Record<string, string>;
  onUpdateParam: (key: string, value: string) => void;
  onRemove: () => void;
  highlighted?: boolean;
}

/**
 * React Flow node for a pipeline output tap — a passthrough node that always
 * appears in the output panel so the user can inspect intermediate pipeline state.
 */
export function PipelineOutputNode({ id, data, selected }: NodeProps) {
  const nodeData = data as OutputNodeData;
  const isHighlighted = !!nodeData.highlighted;

  const borderColor =
    selected || isHighlighted ? "var(--brand-solid-strong)" : "var(--accent-alpha-medium)";

  const background = isHighlighted ? "var(--accent-alpha-weak)" : "var(--accent-alpha-weak)";

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
          <Text variant="label-strong-s">Output</Text>
          <IconButton
            icon="close"
            size="s"
            variant="ghost"
            tooltip="Remove output node"
            onClick={nodeData.onRemove}
          />
        </Row>
        <Input
          id={`${id}-label`}
          label="Label"
          placeholder="Optional label..."
          value={nodeData.params.label ?? ""}
          onChange={(e) => nodeData.onUpdateParam("label", e.target.value)}
          height="s"
          className="nodrag"
        />
      </Column>

      <Handle type="source" position={Position.Bottom} isConnectableStart={false} />
    </div>
  );
}
