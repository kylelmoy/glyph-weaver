"use client";

import { Column, IconButton, Row, Text, Textarea } from "@once-ui-system/core";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { useEffect, useRef, useState } from "react";

export interface InputNodeData extends Record<string, unknown> {
  text: string;
  onTextChange: (text: string) => void;
  onRemove?: () => void;
  highlighted?: boolean;
}

const DEBOUNCE_MS = 150;

/**
 * React Flow node for a pipeline input — displays a textarea for source text
 * with a collapse toggle. Shows a remove button when `onRemove` is provided.
 */
export function PipelineInputNode({ id, data, selected }: NodeProps) {
  const nodeData = data as InputNodeData;
  const [collapsed, setCollapsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state makes the textarea instantly responsive. Propagation to the
  // graph (which triggers processGraph) is debounced so the pipeline doesn't
  // re-execute on every keystroke.
  const [localText, setLocalText] = useState(nodeData.text);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks the last value we sent upstream so we can distinguish echoes of our
  // own updates from genuine external changes (load pipeline, reset).
  const lastSentRef = useRef(nodeData.text);

  useEffect(() => {
    if (nodeData.text !== lastSentRef.current) {
      setLocalText(nodeData.text);
      lastSentRef.current = nodeData.text;
    }
  }, [nodeData.text]);

  const handleTextChange = (v: string) => {
    setLocalText(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      lastSentRef.current = v;
      nodeData.onTextChange(v);
    }, DEBOUNCE_MS);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? "";
      if (debounceRef.current) clearTimeout(debounceRef.current);
      lastSentRef.current = text;
      setLocalText(text);
      nodeData.onTextChange(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

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
            <input
              ref={fileInputRef}
              type="file"
              accept="text/*,.txt,.csv,.tsv,.json,.md"
              style={{ display: "none" }}
              onChange={handleUpload}
            />
            <IconButton
              icon="upload"
              size="s"
              variant="ghost"
              tooltip="Load from file"
              onClick={() => fileInputRef.current?.click()}
            />
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
              value={localText}
              onChange={(e) => handleTextChange(e.target.value)}
              lines={5}
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
              {localText.length} chars · {localText === "" ? 0 : localText.split("\n").length} lines
            </Text>
          </>
        )}
      </Column>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}
