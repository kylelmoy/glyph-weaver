"use client";

import { Column, Text } from "@once-ui-system/core";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

export function PipelineInputNode({ selected }: NodeProps) {
  return (
    <div
      style={{
        background: "var(--brand-alpha-weak)",
        border: `2px solid ${selected ? "var(--accent-solid-strong)" : "var(--brand-solid-strong)"}`,
        borderRadius: "var(--radius-m)",
        minWidth: 160,
        padding: "8px 12px",
      }}
    >
      <Column gap="2">
        <Text variant="label-strong-s">Input text</Text>
        <Text variant="body-default-xs" onBackground="neutral-weak">
          Source for the pipeline
        </Text>
      </Column>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
