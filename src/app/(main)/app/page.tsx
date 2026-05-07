"use client";

/**
 * Main page — three-column layout:
 *  Left:   Operations palette (search, categorised accordion, save/load)
 *  Centre: React Flow pipeline canvas
 *  Right:  Output panel (per-leaf text areas)
 */

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { PipelineFlowEditor } from "@/components/PipelineFlowEditor";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { FindFreePosition } from "@/components/IntersectionHelper";
import { usePipeline } from "@/hooks/usePipeline";
import { INPUT_NODE_ID, processGraph } from "@/lib/pipelineGraph";
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
} from "@once-ui-system/core";
import { useEffect, useMemo, useRef, useState } from "react";

// ── Operations palette helpers ────────────────────────────────────────────────

interface CategorySectionProps {
  name: string;
  ops: OperationDefinition[];
  isExpanded: boolean;
  onToggle: () => void;
  onAdd: (operationId: string, asSibling: boolean) => void;
  shiftHeld: boolean;
}

/** Collapsible accordion section used for both named categories and "Recent". */
function CategorySection({ name, ops, isExpanded, onToggle, onAdd, shiftHeld }: CategorySectionProps) {
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--static-space-4)" }}>
          {ops.map((op) => (
            <Button
              key={op.id}
              fillWidth
              size="s"
              variant="secondary"
              suffixIcon={shiftHeld ? "split" : "plus"}
              onClick={(e: React.MouseEvent) => onAdd(op.id, e.shiftKey)}
              title={`${op.description} (Shift + click to branch)`}
            >
              {op.name}
            </Button>
          ))}
        </div>
      )}
    </Column>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(["Recent", "Custom", "Sorting", "Filtering", "Edit"]),
  );
  const [recentOperationIds, setRecentOperationIds] = useState<string[]>([]);
  const [shiftHeld, setShiftHeld] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === "Shift") setShiftHeld(true); };
    const up = (e: KeyboardEvent) => { if (e.key === "Shift") setShiftHeld(false); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

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
    addInputNode,
    addOutputNode,
    updateParam,
    removeOperation,
    removeCascade,
    swapWithParent,
    swapWithChild,
    savePipeline,
    loadPipeline,
    deleteSavedPipeline,
    reset,
  } = usePipeline();

  // Populated by IntersectionHelper (rendered inside the React Flow canvas), which
  // uses the ReactFlow context to check candidate positions against existing nodes.
  const findFreePositionRef = useRef<FindFreePosition | undefined>(undefined);

  const addOperationAndTrack = (operationId: string, asSibling = false) => {
    addOperation(operationId, findFreePositionRef.current, asSibling);
    setRecentOperationIds((prev) =>
      [operationId, ...prev.filter((id) => id !== operationId)].slice(0, 6),
    );
  };

  const handleAddInputNode = () => addInputNode(findFreePositionRef.current);
  const handleAddOutputNode = () => addOutputNode(findFreePositionRef.current);

  const outputs = useMemo(() => processGraph(graph), [graph]);

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
        <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
          <Row vertical="center" gap="s">
            <Logo size={28} />
            <Heading as="h2">Glyph Weaver</Heading>
          </Row>
        </Link>
        <ThemeToggle />
      </Row>

      {/* ── 2-column body ── */}
      <Row fillWidth style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
        {/* ── Left: Operations palette ── */}
        <Column
          style={{
            width: 500,
            flexShrink: 0,
            borderRight: "1px solid var(--neutral-alpha-medium)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Pinned heading + search */}
          <Column gap="s" paddingX="m" paddingTop="m" style={{ flexShrink: 0 }}>
            <Row fillWidth vertical="center" horizontal="between">
              <Heading as="h4">Operations</Heading>
              <IconButton
                icon="reset"
                size="s"
                variant="ghost"
                tooltip="Reset everything"
                onClick={reset}
              />
            </Row>
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
            <Row gap="xs">
              <Button
                style={{ flex: 1 }}
                size="s"
                variant="secondary"
                suffixIcon="plus"
                onClick={handleAddInputNode}
                title="Add a new input node to the canvas"
              >
                Input
              </Button>
              <Button
                style={{ flex: 1 }}
                size="s"
                variant="secondary"
                suffixIcon="plus"
                onClick={handleAddOutputNode}
                title="Add an output tap node to the selected node"
              >
                Output
              </Button>
            </Row>
            <Line />
          </Column>

          {/* Scrollable operation list */}
          <Column
            gap="s"
            padding="m"
            style={{ flex: 1, overflowY: "auto" }}
            className="scrollbar-minimal"
          >
            {filteredOps ? (
              filteredOps.length === 0 ? (
                <Text variant="body-default-s" onBackground="neutral-weak">
                  No results
                </Text>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--static-space-4)" }}>
                  {filteredOps.map((op) => (
                    <Button
                      key={op.id}
                      fillWidth
                      size="s"
                      variant="secondary"
                      suffixIcon={shiftHeld ? "split" : "plus"}
                      onClick={(e: React.MouseEvent) => addOperationAndTrack(op.id, e.shiftKey)}
                      title={`${op.description} (Shift + click to branch)`}
                    >
                      {op.name}
                    </Button>
                  ))}
                </div>
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
                    shiftHeld={shiftHeld}
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
                    shiftHeld={shiftHeld}
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

        {/* ── Right: Flow canvas ── */}
        <Column style={{ flex: 1, overflow: "hidden", minWidth: 0, position: "relative" }}>
          <PipelineFlowEditor
            graph={graph}
            onGraphChange={setGraph}
            onUpdateParam={updateParam}
            onRemoveNode={removeOperation}
            onSwapWithParent={swapWithParent}
            onSwapWithChild={swapWithChild}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            findFreePositionRef={findFreePositionRef}
            onRemoveCascadeNode={removeCascade}
            outputs={outputs}
          />
          <Row
            horizontal="center"
            gap="8"
            paddingY="s"
            style={{ position: "absolute", bottom: 0, left: 0, right: 0, pointerEvents: "none" }}
          >
            <IconButton
              href="https://github.com/kylelmoy/glyph-weaver"
              icon="github"
              tooltip="kylelmoy/glyph-weaver on GitHub"
              size="s"
              variant="ghost"
              style={{ pointerEvents: "auto" }}
            />
            <IconButton
              href="https://www.linkedin.com/in/kylelmoy/"
              icon="linkedin"
              tooltip="Kyle Moy on LinkedIn"
              size="s"
              variant="ghost"
              style={{ pointerEvents: "auto" }}
            />
            <IconButton
              href="https://www.kylelmoy.com"
              icon="person"
              tooltip="Kyle Moy's Bio"
              size="s"
              variant="ghost"
              style={{ pointerEvents: "auto" }}
            />
          </Row>
        </Column>
      </Row>
    </Column>
  );
}
