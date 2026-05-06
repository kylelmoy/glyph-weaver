"use client";

import { Column, IconButton, Row, Text, Textarea } from "@once-ui-system/core";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { useState } from "react";

export interface InputNodeData extends Record<string, unknown> {
  text: string;
  onTextChange: (text: string) => void;
  onRemove?: () => void;
  highlighted?: boolean;
}

/**
 * React Flow node for a pipeline input — displays a textarea for source text
 * with a collapse toggle. Shows a remove button when `onRemove` is provided.
 */
export function PipelineInputNode({ id, data, selected }: NodeProps) {
  const nodeData = data as InputNodeData;
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      style={{
        background: nodeData.highlighted ? "var(--accent-alpha-weak)" : undefined,
        border: `2px solid ${selected || nodeData.highlighted ? "var(--brand-solid-strong)" : "var(--neutral-alpha-medium)"}`,
        borderRadius: "var(--radius-m)",
        minWidth: 240,
        transition: "background 0.15s",
      }}
    >
      <Column gap="xs" padding="s">
        <Row vertical="center" horizontal="between">
          <Text variant="label-strong-s">Input</Text>
          <Row gap="2">
            <IconButton
              icon={collapsed ? "maximize" : "minimize"}
              size="s"
              variant="ghost"
              tooltip={collapsed ? "Expand" : "Collapse"}
              onClick={() => setCollapsed((c) => !c)}
            />
            {nodeData.onRemove && (
              <IconButton
                icon="close"
                size="s"
                variant="ghost"
                tooltip="Remove input node"
                onClick={nodeData.onRemove}
              />
            )}
          </Row>
        </Row>

        {!collapsed && (
          <>
            <Textarea
              id={`pipeline-input-${id}`}
              placeholder="Enter input text..."
              value={nodeData.text}
              onChange={(e) => nodeData.onTextChange(e.target.value)}
              lines={5}
              resize="both"
              className="nodrag nowheel"
              style={{ fontFamily: "monospace", fontSize: "12px", lineHeight: "normal", minHeight: "300px", minWidth: "200px" }}
            />
            <Text variant="body-default-xs" onBackground="neutral-weak" align="right">
              {nodeData.text.length} chars ·{" "}
              {nodeData.text === "" ? 0 : nodeData.text.split("\n").length} lines
            </Text>
          </>
        )}
      </Column>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}
