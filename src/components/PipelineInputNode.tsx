"use client";

import { Column, IconButton, Row, Text, Textarea } from "@once-ui-system/core";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { useState } from "react";

export interface InputNodeData extends Record<string, unknown> {
  inputText: string;
  onInputChange: (text: string) => void;
  highlighted?: boolean;
}

/**
 * React Flow node for the pipeline's input — displays a textarea where the
 * user enters the source text, with a collapse toggle to save canvas space.
 */
export function PipelineInputNode({ data, selected }: NodeProps) {
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
          <IconButton
            icon={collapsed ? "maximize" : "minimize"}
            size="s"
            variant="ghost"
            tooltip={collapsed ? "Expand" : "Collapse"}
            onClick={() => setCollapsed((c) => !c)}
          />
        </Row>

        {!collapsed && (
          <>
            <Textarea
              id="pipeline-input-text"
              placeholder="Enter input text..."
              value={nodeData.inputText}
              onChange={(e) => nodeData.onInputChange(e.target.value)}
              lines={5}
              resize="both"
              className="nodrag nowheel"
            />
            <Text variant="body-default-xs" onBackground="neutral-weak" align="right">
              {nodeData.inputText.length} chars ·{" "}
              {nodeData.inputText === "" ? 0 : nodeData.inputText.split("\n").length} lines
            </Text>
          </>
        )}
      </Column>

      <Handle type="source" position={Position.Bottom} isConnectableStart={false} />
    </div>
  );
}
