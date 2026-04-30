"use client";

import { Logo } from "@/components/Logo";
import { PipelineFlowEditor } from "@/components/PipelineFlowEditor";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usePipeline } from "@/hooks/usePipeline";
import { INPUT_NODE_ID, processGraph } from "@/lib/pipelineGraph";
import type { GraphOutput } from "@/lib/pipelineGraph";
import { OPERATIONS, OPERATION_CATEGORIES } from "@/lib/textOperations";
import {
  Button,
  Column,
  Heading,
  Icon,
  IconButton,
  Input,
  Line,
  Row,
  Text,
  Textarea,
} from "@once-ui-system/core";
import { useCallback, useMemo, useState } from "react";

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(["Recent", "Custom", "Sorting", "Filtering"]),
  );
  const [recentOperationIds, setRecentOperationIds] = useState<string[]>([]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const {
    graph,
    setGraph,
    selectedNodeId,
    setSelectedNodeId,
    pipelineName,
    setPipelineName,
    savedPipelines,
    showSaved,
    setShowSaved,
    addOperation,
    updateParam,
    removeOperation,
    savePipeline,
    loadPipeline,
    deleteSavedPipeline,
  } = usePipeline();

  const handleUpdateParam = useCallback(
    (nodeId: string, key: string, value: string) => updateParam(nodeId, key, value),
    [updateParam],
  );

  const handleRemoveNode = useCallback(
    (nodeId: string) => removeOperation(nodeId),
    [removeOperation],
  );

  const addOperationAndTrack = (operationId: string) => {
    addOperation(operationId);
    setRecentOperationIds((prev) =>
      [operationId, ...prev.filter((id) => id !== operationId)].slice(0, 6),
    );
  };

  const outputs = useMemo(() => processGraph(inputText, graph), [inputText, graph]);

  return (
    <Column fillWidth style={{ height: "100dvh", overflow: "hidden" }}>
      {/* ── Header ── */}
      <Row
        fillWidth
        paddingX="m"
        paddingY="s"
        vertical="center"
        horizontal="between"
        style={{ borderBottom: "1px solid var(--neutral-alpha-medium)", flexShrink: 0 }}
      >
        <Row vertical="center" gap="s">
          <Logo size={28} />
          <Heading variant="heading-strong-s">Glyph Weaver</Heading>
        </Row>
        <ThemeToggle />
      </Row>

      {/* ── 3-column body ── */}
      <Row fillWidth style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>

        {/* ── Left: Operations palette ── */}
        <Column
          style={{
            width: 300,
            flexShrink: 0,
            borderRight: "1px solid var(--neutral-alpha-medium)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Scrollable operation list */}
          <Column gap="s" padding="m" style={{ flex: 1, overflowY: "auto" }}>
            <Text variant="label-default-xs" onBackground="neutral-weak">
              Operations
            </Text>

            {recentOperationIds.length > 0 &&
              (() => {
                const isExpanded = expandedCategories.has("Recent");
                return (
                  <Column gap="4">
                    <Row
                      fillWidth
                      vertical="center"
                      horizontal="between"
                      onClick={() => toggleCategory("Recent")}
                      style={{ cursor: "pointer" }}
                    >
                      <Text variant="label-default-xs" onBackground="neutral-weak">
                        Recent
                      </Text>
                      <Icon
                        name={isExpanded ? "chevronUp" : "chevronDown"}
                        size="xs"
                        onBackground="neutral-weak"
                      />
                    </Row>
                    {isExpanded && (
                      <Column gap="4">
                        {recentOperationIds.map((id) => {
                          const op = OPERATIONS.find((o) => o.id === id);
                          if (!op) return null;
                          return (
                            <Button
                              key={op.id}
                              fillWidth
                              size="s"
                              variant="secondary"
                              suffixIcon="plus"
                              onClick={() => addOperationAndTrack(op.id)}
                              title={op.description}
                            >
                              {op.name}
                            </Button>
                          );
                        })}
                      </Column>
                    )}
                  </Column>
                );
              })()}

            {OPERATION_CATEGORIES.map((category) => {
              const ops = OPERATIONS.filter((op) => op.category === category);
              const isExpanded = expandedCategories.has(category);
              return (
                <Column key={category} gap="4">
                  <Row
                    fillWidth
                    vertical="center"
                    horizontal="between"
                    onClick={() => toggleCategory(category)}
                    style={{ cursor: "pointer" }}
                  >
                    <Text variant="label-default-xs" onBackground="neutral-weak">
                      {category}
                    </Text>
                    <Icon
                      name={isExpanded ? "chevronUp" : "chevronDown"}
                      size="xs"
                      onBackground="neutral-weak"
                    />
                  </Row>
                  {isExpanded && (
                    <Column gap="4">
                      {ops.map((op) => (
                        <Button
                          key={op.id}
                          fillWidth
                          size="s"
                          variant="secondary"
                          suffixIcon="plus"
                          onClick={() => addOperationAndTrack(op.id)}
                          title={op.description}
                        >
                          {op.name}
                        </Button>
                      ))}
                    </Column>
                  )}
                </Column>
              );
            })}
          </Column>

          {/* Save / Load — always visible at bottom of sidebar */}
          <Column
            gap="xs"
            padding="m"
            style={{ borderTop: "1px solid var(--neutral-alpha-medium)", flexShrink: 0 }}
          >
            <Row fillWidth vertical="center">
              <Input
                style={{ flex: 1 }}
                id="pipeline-name"
                placeholder="Name..."
                value={pipelineName}
                onChange={(e) => setPipelineName(e.target.value)}
                height="s"
                radius="left"
              />
              <Button
                size="l"
                prefixIcon="save"
                variant="secondary"
                disabled={graph.nodes.every((n) => n.id === INPUT_NODE_ID)}
                onClick={savePipeline}
                radius="right"
              >
                Save
              </Button>
            </Row>

            {savedPipelines.length > 0 && (
              <Column fillWidth gap="xs">
                <Button
                  size="s"
                  variant="tertiary"
                  suffixIcon={showSaved ? "chevronUp" : "chevronDown"}
                  onClick={() => setShowSaved((v) => !v)}
                >
                  {savedPipelines.length} saved pipeline{savedPipelines.length !== 1 ? "s" : ""}
                </Button>

                {showSaved && (
                  <Column gap="xs" style={{ maxHeight: 240, overflowY: "auto" }}>
                    {savedPipelines.map((saved) => (
                      <Row
                        key={saved.id}
                        gap="s"
                        vertical="center"
                        horizontal="between"
                        padding="s"
                        border="neutral-alpha-medium"
                        radius="s"
                      >
                        <Column gap="2" style={{ minWidth: 0 }}>
                          <Text
                            variant="label-strong-s"
                            style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          >
                            {saved.name}
                          </Text>
                          <Text variant="body-default-xs" onBackground="neutral-weak">
                            {saved.graph.nodes.length} op{saved.graph.nodes.length !== 1 ? "s" : ""}
                            {" · "}
                            {new Date(saved.savedAt).toLocaleDateString()}
                          </Text>
                        </Column>
                        <Row gap="xs" style={{ flexShrink: 0 }}>
                          <Button size="s" variant="secondary" onClick={() => loadPipeline(saved)}>
                            Load
                          </Button>
                          <IconButton
                            icon="close"
                            size="s"
                            variant="ghost"
                            tooltip="Delete"
                            onClick={() => deleteSavedPipeline(saved.id)}
                          />
                        </Row>
                      </Row>
                    ))}
                  </Column>
                )}
              </Column>
            )}
          </Column>
        </Column>

        {/* ── Center: Flow canvas ── */}
        <Column style={{ flex: 1, overflow: "hidden", minWidth: 0 }}>
          <PipelineFlowEditor
            graph={graph}
            onGraphChange={setGraph}
            onUpdateParam={handleUpdateParam}
            onRemoveNode={handleRemoveNode}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />
        </Column>

        {/* ── Right: Input / Output ── */}
        <Column
          gap="m"
          padding="m"
          style={{
            width: 300,
            flexShrink: 0,
            borderLeft: "1px solid var(--neutral-alpha-medium)",
            overflowY: "auto",
          }}
        >
          <Column gap="xs">
            <Text variant="label-default-xs" onBackground="neutral-weak">
              Input
            </Text>
            <Textarea
              id="input"
              placeholder="Paste text here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              lines={8}
              resize="vertical"
            />
            <Text variant="body-default-xs" onBackground="neutral-weak" align="right">
              {inputText.length} chars · {inputText === "" ? 0 : inputText.split("\n").length} lines
            </Text>
          </Column>

          <Line />

          <Column gap="xs">
            <Text variant="label-default-xs" onBackground="neutral-weak">
              {outputs.length > 1 ? `Outputs (${outputs.length})` : "Output"}
            </Text>
            {outputs.length === 1 ? (
              <>
                <Textarea
                  id="output"
                  placeholder="Transformed text appears here"
                  value={outputs[0].text}
                  readOnly
                  lines={8}
                  resize="vertical"
                />
                <Text variant="body-default-xs" onBackground="neutral-weak" align="right">
                  {outputs[0].text.length} chars ·{" "}
                  {outputs[0].text === "" ? 0 : outputs[0].text.split("\n").length} lines
                </Text>
              </>
            ) : (
              outputs.map((out: GraphOutput, i: number) => (
                <Column key={out.id} gap="xs">
                  <Text variant="label-default-xs" onBackground="neutral-weak">
                    Output {i + 1}
                  </Text>
                  <Textarea
                    id={`output-${out.id}`}
                    value={out.text}
                    readOnly
                    resize="vertical"
                    lines={4}
                  />
                  <Text variant="body-default-xs" onBackground="neutral-weak" align="right">
                    {out.text.length} chars ·{" "}
                    {out.text === "" ? 0 : out.text.split("\n").length} lines
                  </Text>
                </Column>
              ))
            )}
          </Column>

          <Row horizontal="center" gap="8" marginTop="m">
            <IconButton
              href="https://github.com/kylelmoy/glyph-weaver"
              icon="github"
              tooltip="kylelmoy/glyph-weaver on GitHub"
              size="s"
              variant="ghost"
            />
            <IconButton
              href="https://www.linkedin.com/in/kylelmoy/"
              icon="linkedin"
              tooltip="Kyle Moy on LinkedIn"
              size="s"
              variant="ghost"
            />
            <IconButton
              href="https://www.kylelmoy.com"
              icon="person"
              tooltip="Kyle Moy's Bio"
              size="s"
              variant="ghost"
            />
          </Row>
        </Column>
      </Row>
    </Column>
  );
}
