"use client";

/**
 * Main page — three-column layout:
 *  Left:   Operations palette (search, categorised accordion, save/load)
 *  Centre: React Flow pipeline canvas
 *  Right:  Output panel (per-leaf text areas)
 */

import { Logo } from "@/components/Logo";
import { PipelineFlowEditor } from "@/components/PipelineFlowEditor";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usePipeline } from "@/hooks/usePipeline";
import { INPUT_NODE_ID, processGraph } from "@/lib/pipelineGraph";
import type { GraphOutput } from "@/lib/pipelineGraph";
import { OPERATIONS, OPERATION_CATEGORIES } from "@/lib/operations";
import type { OperationDefinition } from "@/lib/operations";
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ── Operations palette helpers ────────────────────────────────────────────────

interface CategorySectionProps {
  name: string;
  ops: OperationDefinition[];
  isExpanded: boolean;
  onToggle: () => void;
  onAdd: (operationId: string) => void;
}

/** Collapsible accordion section used for both named categories and "Recent". */
function CategorySection({ name, ops, isExpanded, onToggle, onAdd }: CategorySectionProps) {
  return (
    <Column gap="4">
      <Row
        fillWidth
        vertical="center"
        horizontal="between"
        onClick={onToggle}
        style={{ cursor: "pointer" }}
      >
        <Heading as="h5">{name}</Heading>
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
              onClick={() => onAdd(op.id)}
              title={op.description}
            >
              {op.name}
            </Button>
          ))}
        </Column>
      )}
    </Column>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [inputText, setInputText] = useState("");
  const inputSaveCount = useRef(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("glyph-weaver-session-input");
      if (stored !== null) setInputText(stored);
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  useEffect(() => {
    inputSaveCount.current++;
    if (inputSaveCount.current === 1) return;
    try {
      localStorage.setItem("glyph-weaver-session-input", inputText);
    } catch {
      /* localStorage unavailable or quota exceeded */
    }
  }, [inputText]);
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
    swapWithParent,
    swapWithChild,
    savePipeline,
    loadPipeline,
    deleteSavedPipeline,
    reset,
  } = usePipeline();

  const handleUpdateParam = useCallback(
    (nodeId: string, key: string, value: string) => updateParam(nodeId, key, value),
    [updateParam],
  );

  const handleRemoveNode = useCallback(
    (nodeId: string) => removeOperation(nodeId),
    [removeOperation],
  );

  // Populated by IntersectionHelper (rendered inside the React Flow canvas), which
  // uses the ReactFlow context to check candidate positions against existing nodes.
  const findFreePositionRef = useRef<
    ((pos: { x: number; y: number }) => { x: number; y: number }) | undefined
  >(undefined);

  const addOperationAndTrack = (operationId: string) => {
    addOperation(operationId, findFreePositionRef.current);
    setRecentOperationIds((prev) =>
      [operationId, ...prev.filter((id) => id !== operationId)].slice(0, 6),
    );
  };

  const outputs = useMemo(() => processGraph(inputText, graph), [inputText, graph]);

  const handleReset = () => {
    reset();
    setInputText("");
    try {
      localStorage.removeItem("glyph-weaver-session-input");
    } catch {}
  };

  const [hoveredLeafId, setHoveredLeafId] = useState<string | null>(null);
  const [hoveredOutputId, setHoveredOutputId] = useState<string | null>(null);
  const [operationSearch, setOperationSearch] = useState("");
  const searchQuery = operationSearch.trim().toLowerCase();
  const filteredOps = searchQuery
    ? OPERATIONS.filter(
        (op) =>
          op.name.toLowerCase().includes(searchQuery) ||
          op.description.toLowerCase().includes(searchQuery),
      )
    : null;

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
          <Heading as="h1">Glyph Weaver</Heading>
        </Row>
        <Row gap="s" vertical="center">
          <IconButton
            icon="refresh"
            size="s"
            variant="ghost"
            tooltip="Reset everything"
            onClick={handleReset}
          />
          <ThemeToggle />
        </Row>
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
          {/* Pinned heading + search */}
          <Column gap="s" paddingX="m" paddingTop="m" style={{ flexShrink: 0 }}>
            <Heading as="h4">Operations</Heading>
            <Input
              id="op-search"
              placeholder="Search..."
              value={operationSearch}
              onChange={(e) => setOperationSearch(e.target.value)}
              height="s"
              hasSuffix={
                operationSearch ? (
                  <IconButton
                    icon="close"
                    size="s"
                    variant="ghost"
                    tooltip="Clear search"
                    onClick={() => setOperationSearch("")}
                  />
                ) : undefined
              }
            />
          </Column>

          {/* Scrollable operation list */}
          <Column gap="s" padding="m" style={{ flex: 1, overflowY: "auto" }}>
            {filteredOps ? (
              filteredOps.length === 0 ? (
                <Text variant="body-default-s" onBackground="neutral-weak">
                  No results
                </Text>
              ) : (
                <Column gap="4">
                  {filteredOps.map((op) => (
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
              )
            ) : (
              <>
                {recentOperationIds.length > 0 && (
                  <CategorySection
                    name="Recent"
                    ops={recentOperationIds.flatMap((id) => {
                      const op = OPERATIONS.find((o) => o.id === id);
                      return op ? [op] : [];
                    })}
                    isExpanded={expandedCategories.has("Recent")}
                    onToggle={() => toggleCategory("Recent")}
                    onAdd={addOperationAndTrack}
                  />
                )}

                {OPERATION_CATEGORIES.map((category) => (
                  <CategorySection
                    key={category}
                    name={category}
                    ops={OPERATIONS.filter((op) => op.category === category)}
                    isExpanded={expandedCategories.has(category)}
                    onToggle={() => toggleCategory(category)}
                    onAdd={addOperationAndTrack}
                  />
                ))}
              </>
            )}
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
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
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
            onSwapWithParent={swapWithParent}
            onSwapWithChild={swapWithChild}
            inputText={inputText}
            onInputChange={setInputText}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onHoverLeafNode={setHoveredLeafId}
            hoveredOutputId={hoveredOutputId}
            findFreePositionRef={findFreePositionRef}
          />
        </Column>

        {/* ── Right: Input / Output ── */}
        <Column
          style={{
            width: 300,
            flexShrink: 0,
            borderLeft: "1px solid var(--neutral-alpha-medium)",
            overflow: "hidden",
          }}
        >
          {/* Scrollable output */}
          <Column gap="m" padding="m" style={{ flex: 1, overflowY: "auto" }}>
            <Column gap="xs">
              <Text variant="label-default-xs" onBackground="neutral-weak">
                {outputs.length > 1 ? `Outputs (${outputs.length})` : "Output"}
              </Text>
              {outputs.length === 1 ? (
                <>
                  <Textarea
                    id="output"
                    value={outputs[0].text}
                    readOnly
                    lines={8}
                    resize="vertical"
                    style={{
                      background:
                        hoveredLeafId === outputs[0].id ? "var(--accent-alpha-weak)" : undefined,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={() => setHoveredOutputId(outputs[0].id)}
                    onMouseLeave={() => setHoveredOutputId(null)}
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
                      style={{
                        background:
                          hoveredLeafId === out.id ? "var(--accent-alpha-weak)" : undefined,
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={() => setHoveredOutputId(out.id)}
                      onMouseLeave={() => setHoveredOutputId(null)}
                    />
                    <Text variant="body-default-xs" onBackground="neutral-weak" align="right">
                      {out.text.length} chars · {out.text === "" ? 0 : out.text.split("\n").length}{" "}
                      lines
                    </Text>
                  </Column>
                ))
              )}
            </Column>
          </Column>

          {/* Pinned footer */}
          <Row
            horizontal="center"
            gap="8"
            paddingY="s"
            style={{ borderTop: "1px solid var(--neutral-alpha-medium)", flexShrink: 0 }}
          >
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
