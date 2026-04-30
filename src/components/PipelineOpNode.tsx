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
  highlighted?: boolean;
}

export function PipelineOpNode({ id, data, selected }: NodeProps) {
  const nodeData = data as OpNodeData;
  const op = OPERATIONS.find((o) => o.id === nodeData.operationId);
  if (!op) return null;

  return (
    <div
      style={{
        background: nodeData.highlighted ? "var(--accent-alpha-weak)" : "var(--background-page)",
        border: `2px solid ${selected ? "var(--brand-solid-strong)" : "var(--neutral-alpha-medium)"}`,
        transition: "background 0.15s",
        borderRadius: "var(--radius-m)",
        minWidth: 200,
        maxWidth: 280,
      }}
    >
      <Handle type="target" position={Position.Top} />

      <Column gap="xs" padding="s">
        <Row gap="s" vertical="center" horizontal="between">
          <Text variant="label-strong-s" title={op.description}>
            {op.name}
          </Text>
          <IconButton
            icon="close"
            size="s"
            variant="ghost"
            tooltip="Remove"
            onClick={nodeData.onRemove}
          />
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

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
