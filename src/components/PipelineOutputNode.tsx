"use client";

import { Column, IconButton, Row, Text, Textarea } from "@once-ui-system/core";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

export interface OutputNodeData extends Record<string, unknown> {
  params: Record<string, string>;
  onUpdateParam: (key: string, value: string) => void;
  onRemove: () => void;
  highlighted?: boolean;
  /** Computed output text from processGraph, injected by PipelineFlowEditor. */
  text?: string;
  /** True when this node is in the cascade-delete preview set. */
  deletePending?: boolean;
}

/**
 * React Flow node for a pipeline output tap — a passthrough node that displays
 * the computed text at that point in the pipeline directly on the canvas.
 */
export function PipelineOutputNode({ id, data, selected }: NodeProps) {
  const nodeData = data as OutputNodeData;
  const isDeletable = !!nodeData.deletePending;
  const isHighlighted = !isDeletable && !!nodeData.highlighted;
  const text = nodeData.text ?? "";

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
      }}
    >
      <Handle type="target" position={Position.Left} isConnectableStart={false} />

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
        <Textarea
          id={`${id}-output`}
          value={text}
          readOnly
          lines={4}
          resize="both"
          className="nodrag nowheel"
          style={{
            fontFamily: "monospace",
            fontSize: "12px",
            lineHeight: "normal",
            minHeight: "300px",
            minWidth: "200px",
          }}
        />
        <Text variant="body-default-xs" onBackground="neutral-weak" align="right">
          {text.length} chars · {text === "" ? 0 : text.split("\n").length} lines
        </Text>
      </Column>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}
