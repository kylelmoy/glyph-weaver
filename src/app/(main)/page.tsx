"use client";

/**
 * Home — the single-page UI for Glyph Weaver.
 *
 * Layout: Input (left) | Output (right) → Pipeline builder (left) + Operations palette (right).
 * All pipeline state lives in the `usePipeline` hook; text processing is a
 * pure memoized derivation via `processText`.
 */

import {
  Column,
  Row,
  Textarea,
  Input,
  Button,
  IconButton,
  Icon,
  Text,
  Heading,
  Line,
} from "@once-ui-system/core";
import { useState, useMemo } from "react";
import { OPERATIONS, OPERATION_CATEGORIES, processText } from "@/lib/textOperations";
import { usePipeline } from "@/hooks/usePipeline";
import { PipelineStep } from "@/components/PipelineStep";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

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
    pipeline,
    pipelineName,
    setPipelineName,
    savedPipelines,
    showSaved,
    setShowSaved,
    addOperation,
    updateParam,
    removeOperation,
    moveOperation,
    savePipeline,
    loadPipeline,
    deleteSavedPipeline,
  } = usePipeline();

  const addOperationAndTrack = (operationId: string) => {
    addOperation(operationId);
    setRecentOperationIds((prev) =>
      [operationId, ...prev.filter((id) => id !== operationId)].slice(0, 6),
    );
  };

  const outputText = useMemo(
    () => processText(inputText, pipeline),
    [inputText, pipeline],
  );

  return (
    <Column
      fillWidth
      padding="l"
      gap="m"
      style={{ maxWidth: 960, margin: "0 auto", minHeight: "100vh" }}
    >
      <Row fillWidth vertical="center" horizontal="between">
        <Row vertical="center" gap="s">
          <Logo size={32} />
          <Heading>Glyph Weaver</Heading>
        </Row>
        <ThemeToggle />
      </Row>

      {/* ── Input | Output ── */}
      <Row fillWidth gap="m" vertical="stretch">
        <Column flex={1} gap="xs">
          <Heading variant="heading-strong-xs">Input</Heading>
          <Textarea
            id="input"
            placeholder="Put text here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            lines={8}
            resize="vertical"
          />
          <Text variant="body-default-xs" onBackground="neutral-weak" align="right">
            {inputText.length} chars · {inputText === "" ? 0 : inputText.split("\n").length} lines
          </Text>
        </Column>
        <Column flex={1} gap="xs" fillHeight>
          <Heading variant="heading-strong-xs">Output</Heading>
          <div className="fill-height-textarea">
            <Textarea
              id="output"
              placeholder="...and your transformed text appears here!"
              value={outputText}
              readOnly
              resize="none"
            />
          </div>
          <Text variant="body-default-xs" onBackground="neutral-weak" align="right">
            {outputText.length} chars · {outputText === "" ? 0 : outputText.split("\n").length} lines
          </Text>
        </Column>
      </Row>

      <Line />

      <Row fillWidth gap="m" vertical="stretch">
        {/* ── Active Pipeline ── */}
        <Column flex={1} padding="m" radius="m">
          <Column fillWidth fillHeight>
            <Heading variant="heading-strong-xs" marginBottom="s">Pipeline</Heading>

            {pipeline.length === 0 ? (
              // Empty state — shown before any operation is added
              <Column gap="s">
                <Text variant="body-strong-s" onBackground="neutral-weak">
                  Welcome to Glyph Weaver!
                </Text>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  A simple data transformation playground to build pipelines for text manipulation. Add, remove, and reorder operations to see how they affect your input in real time.
                </Text>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Add an operation from the right to get started!
                </Text>
              </Column>
            ) : (
              pipeline.map((item, index) => {
                const op = OPERATIONS.find((o) => o.id === item.operationId);
                if (!op) return null;
                return (
                  <PipelineStep
                    key={item.instanceId}
                    item={item}
                    op={op}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === pipeline.length - 1}
                    onUpdate={(key, value) => updateParam(item.instanceId, key, value)}
                    onRemove={() => removeOperation(item.instanceId)}
                    onMove={(direction) => moveOperation(index, direction)}
                  />
                );
              })
            )}
          </Column>

          {/* ── Save / Load ── */}
          <Column fillWidth gap="xs" marginTop="m">
            <Line />
            <Row fillWidth vertical="center">
              <Input
                style={{ flex: 1 }}
                id="pipeline-name"
                placeholder="Name this pipeline..."
                value={pipelineName}
                onChange={(e) => setPipelineName(e.target.value)}
                height="s"
                radius="left"
              />
              <Button
                size="l"
                prefixIcon="save"
                variant="secondary"
                disabled={pipeline.length === 0}
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
                  <Column gap="xs">
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
                        <Column gap="2">
                          <Text variant="label-strong-s">{saved.name}</Text>
                          <Text variant="body-default-xs" onBackground="neutral-weak">
                            {saved.pipeline.length} operation{saved.pipeline.length !== 1 ? "s" : ""}{" · "}
                            {new Date(saved.savedAt).toLocaleDateString()}
                          </Text>
                        </Column>
                        <Row gap="xs">
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

        {/* ── Operations Palette ── */}
        <Column flex={1} gap="s" padding="m" radius="m">
          <Heading variant="heading-strong-xs">Operations</Heading>

          {/* Recent — only shown after at least one operation has been used */}
          {recentOperationIds.length > 0 && (() => {
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
                  <Text variant="label-default-xs" onBackground="neutral-weak">Recent</Text>
                  <Icon name={isExpanded ? "chevronUp" : "chevronDown"} size="xs" onBackground="neutral-weak" />
                </Row>
                {isExpanded && (
                  <Row wrap gap="xs">
                    {recentOperationIds.map((id) => {
                      const op = OPERATIONS.find((o) => o.id === id);
                      if (!op) return null;
                      return (
                        <Button
                          key={op.id}
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
                  </Row>
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
                  <Text variant="label-default-xs" onBackground="neutral-weak">
                    <Icon name={isExpanded ? "chevronUp" : "chevronDown"} size="xs" onBackground="neutral-weak" />
                  </Text>
                </Row>
                {isExpanded && (
                  <Row wrap gap="xs">
                    {ops.map((op) => (
                      <Button
                        key={op.id}
                        size="s"
                        variant="secondary"
                        suffixIcon="plus"
                        onClick={() => addOperationAndTrack(op.id)}
                        title={op.description}
                      >
                        {op.name}
                      </Button>
                    ))}
                  </Row>
                )}
              </Column>
            );
          })}
        </Column>
      </Row>

      {/* ── Footer ── */}
      <Row as="footer" fillWidth padding="8" horizontal="center" s={{ direction: "column" }}>
        <Row
          maxWidth="m"
          paddingY="8"
          paddingX="16"
          gap="16"
          horizontal="between"
          vertical="center"
          s={{ direction: "column", horizontal: "center", align: "center" }}
        >
          <Text variant="body-default-s" onBackground="neutral-strong">
            <Text onBackground="neutral-weak">© 2026 /</Text>
            <Text paddingX="4">Kyle Moy</Text>
          </Text>
          <Row gap="16">
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
        </Row>
        <Row height="80" hide s={{ hide: false }} />
      </Row>
    </Column>
  );
}
