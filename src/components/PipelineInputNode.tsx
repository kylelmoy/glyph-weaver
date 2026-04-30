"use client";

import { Column, Text } from "@once-ui-system/core";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

export function PipelineInputNode({ data, selected }: NodeProps) {
  const highlighted = (data as { highlighted?: boolean }).highlighted;
  return (
    <div
      style={{
        background: highlighted ? "var(--accent-alpha-weak)" : undefined,
        border: `2px solid ${selected ? "var(--accent-solid-strong)" : "var(--neutral-alpha-medium)"}`,
        borderRadius: "var(--radius-m)",
        minWidth: 160,
        padding: "8px 12px",
        transition: "background 0.15s",
      }}
    >
      <Column gap="2">
        <Text variant="label-strong-s">→ Input</Text>
      </Column>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
