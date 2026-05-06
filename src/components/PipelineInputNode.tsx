"use client";

import { Column, IconButton, Row, Text, Textarea } from "@once-ui-system/core";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { useState } from "react";

export interface InputNodeData extends Record<string, unknown> {
  /** True for the primary input node; false for additional input nodes. */
  isPrimary?: boolean;
  // Primary input fields:
  inputText?: string;
  onInputChange?: (text: string) => void;
  // Additional input fields:
  text?: string;
  onTextChange?: (text: string) => void;
  onRemove?: () => void;
  highlighted?: boolean;
}

/**
 * React Flow node for a pipeline input — displays a textarea for source text
 * with a collapse toggle. Primary and additional input nodes share this component;
 * additional nodes show a remove button.
 */
export function PipelineInputNode({ id, data, selected }: NodeProps) {
  const nodeData = data as InputNodeData;
  const [collapsed, setCollapsed] = useState(false);

  const isPrimary = nodeData.isPrimary !== false;
  const displayText = isPrimary ? (nodeData.inputText ?? "") : (nodeData.text ?? "");
  const handleChange = isPrimary ? nodeData.onInputChange : nodeData.onTextChange;

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
            {!isPrimary && nodeData.onRemove && (
              <IconButton
                icon="close"
                size="s"
                variant="ghost"
                tooltip="Remove input node"
                onClick={nodeData.onRemove}
              />
            )}
            <IconButton
              icon={collapsed ? "maximize" : "minimize"}
              size="s"
              variant="ghost"
              tooltip={collapsed ? "Expand" : "Collapse"}
              onClick={() => setCollapsed((c) => !c)}
            />
          </Row>
        </Row>

        {!collapsed && (
          <>
            <Textarea
              id={isPrimary ? "pipeline-input-text" : `pipeline-input-${id}`}
              placeholder="Enter input text..."
              value={displayText}
              onChange={(e) => handleChange?.(e.target.value)}
              lines={5}
              resize="both"
              className="nodrag nowheel"
            />
            <Text variant="body-default-xs" onBackground="neutral-weak" align="right">
              {displayText.length} chars ·{" "}
              {displayText === "" ? 0 : displayText.split("\n").length} lines
            </Text>
          </>
        )}
      </Column>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}
