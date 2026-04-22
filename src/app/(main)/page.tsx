"use client";

import {
  Column,
  Row,
  Textarea,
  Input,
  Button,
  IconButton,
  Text,
  Heading,
  Line,
} from "@once-ui-system/core";
import { useState, useMemo, useRef, useEffect, Fragment } from "react";
import { OPERATIONS, OPERATION_CATEGORIES, processText } from "@/lib/textOperations";
import type { PipelineItem } from "@/lib/textOperations";

const STORAGE_KEY = "glyph-weaver-pipelines";

interface SavedPipeline {
  id: string;
  name: string;
  savedAt: number;
  pipeline: PipelineItem[];
}

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
  const [pipelineName, setPipelineName] = useState("");
  const [savedPipelines, setSavedPipelines] = useState<SavedPipeline[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSavedPipelines(JSON.parse(stored) as SavedPipeline[]);
    } catch {
      // ignore malformed storage
    }
  }, []);

  const outputText = useMemo(
    () => processText(inputText, pipeline),
    [inputText, pipeline],
  );

  const addOperation = (operationId: string) => {
    const op = OPERATIONS.find((o) => o.id === operationId);
    const params: Record<string, string> = {};
    for (const p of op?.params ?? []) params[p.key] = "";
    setPipeline((prev) => [
      ...prev,
      { instanceId: String(nextId.current++), operationId, params },
    ]);
  };

  const updateParam = (instanceId: string, key: string, value: string) => {
    setPipeline((prev) =>
      prev.map((item) =>
        item.instanceId === instanceId
          ? { ...item, params: { ...item.params, [key]: value } }
          : item,
      ),
    );
  };

  const removeOperation = (instanceId: string) => {
    setPipeline((prev) => prev.filter((item) => item.instanceId !== instanceId));
  };

  const moveOperation = (index: number, direction: "up" | "down") => {
    setPipeline((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const persist = (updated: SavedPipeline[]) => {
    setSavedPipelines(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const savePipeline = () => {
    const name = pipelineName.trim() || "Untitled";
    const entry: SavedPipeline = { id: String(Date.now()), name, savedAt: Date.now(), pipeline };
    const idx = savedPipelines.findIndex((s) => s.name === name);
    persist(idx >= 0 ? savedPipelines.map((s, i) => (i === idx ? entry : s)) : [...savedPipelines, entry]);
  };

  const loadPipeline = (saved: SavedPipeline) => {
    setPipeline(saved.pipeline);
    setPipelineName(saved.name);
    nextId.current = saved.pipeline.reduce((max, item) => Math.max(max, Number(item.instanceId)), -1) + 1;
  };

  const deleteSavedPipeline = (id: string) => {
    persist(savedPipelines.filter((s) => s.id !== id));
  };

  return (
    <Column
      fillWidth
      padding="l"
      gap="l"
      style={{ maxWidth: 960, margin: "0 auto", minHeight: "100vh" }}
    >
      <Heading>Glyph Weaver</Heading>

      <Column fillWidth gap="s">
        <Heading variant="heading-strong-xs">Input</Heading>
        <Textarea
          id="input"
          placeholder="Paste text here, one item per line..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          lines={8}
          resize="vertical"
        />
      </Column>

      <Line />

      <Row fillWidth gap="m" vertical="start">
        {/* Active Pipeline */}
        <Column flex={1} padding="m" radius="m">
          <Heading variant="heading-strong-xs" marginBottom="s">Pipeline</Heading>
          {pipeline.length === 0 ? (
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
                <Fragment key={item.instanceId}>
                  <Column
                    gap="xs"
                    padding="s"
                    border="neutral-alpha-medium"
                    radius="s"
                  >
                    <Row gap="s" vertical="center" horizontal="between">
                      <Row gap="xs" vertical="center">
                        <Text variant="body-default-s" onBackground="neutral-weak">
                          {index + 1}.
                        </Text>
                        <Text variant="label-strong-s">{op.name}</Text>
                      </Row>
                      <Row gap="2">
                        <IconButton
                          icon="chevronUp"
                          size="s"
                          variant="ghost"
                          tooltip="Move up"
                          disabled={index === 0}
                          onClick={() => moveOperation(index, "up")}
                        />
                        <IconButton
                          icon="chevronDown"
                          size="s"
                          variant="ghost"
                          tooltip="Move down"
                          disabled={index === pipeline.length - 1}
                          onClick={() => moveOperation(index, "down")}
                        />
                        <IconButton
                          icon="close"
                          size="s"
                          variant="ghost"
                          tooltip="Remove"
                          onClick={() => removeOperation(item.instanceId)}
                        />
                      </Row>
                    </Row>
                    {op.params?.map((param) => (
                      <Input
                        key={param.key}
                        id={`${item.instanceId}-${param.key}`}
                        label={param.label}
                        placeholder={param.placeholder}
                        value={item.params[param.key] ?? ""}
                        onChange={(e) =>
                          updateParam(item.instanceId, param.key, e.target.value)
                        }
                        height="s"
                        style={param.monospace ? { fontFamily: "var(--font-code)" } : undefined}
                      />
                    ))}
                  </Column>
                  {index < pipeline.length - 1 && (
                    <Row fillWidth horizontal="center">
                      <Column
                        style={{ width: 2, height: 16 }}
                        background="neutral-alpha-medium"
                      />
                    </Row>
                  )}
                </Fragment>
              );
            })
          )}
        </Column>

        {/* Available Operations */}
        <Column flex={1} gap="s" padding="m" radius="m">
          <Heading variant="heading-strong-xs">Operations</Heading>
          {OPERATION_CATEGORIES.map((category) => {
            const ops = OPERATIONS.filter((op) => op.category === category);
            return (
              <Column key={category} gap="4">
                <Text variant="label-default-xs" onBackground="neutral-weak">
                  {category}
                </Text>
                <Row wrap gap="xs">
                  {ops.map((op) => (
                    <Button
                      key={op.id}
                      size="s"
                      variant="secondary"
                      suffixIcon="plus"
                      onClick={() => addOperation(op.id)}
                    >
                      {op.name}
                    </Button>
                  ))}
                </Row>
              </Column>
            );
          })}
        </Column>
      </Row>

      <Line />

      <Column fillWidth gap="s">
        <Heading variant="heading-strong-xs">Saved Pipelines</Heading>
        <Row fillWidth gap="xs" vertical="center">
          <Input
            style={{ flex: 1 }}
            id="pipeline-name"
            placeholder="Name this pipeline..."
            value={pipelineName}
            onChange={(e) => setPipelineName(e.target.value)}
            height="s"
          />
          <Button
            size="s"
            variant="secondary"
            disabled={pipeline.length === 0}
            onClick={savePipeline}
          >
            Save
          </Button>
        </Row>
        {savedPipelines.length === 0 ? (
          <Text variant="body-default-s" onBackground="neutral-weak">
            No saved pipelines yet. Build a pipeline above and save it here.
          </Text>
        ) : (
          savedPipelines.map((saved) => (
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
          ))
        )}
      </Column>

      <Line />

      <Column fillWidth gap="s">
        <Heading variant="heading-strong-xs">Output</Heading>
        <Textarea
          id="output"
          value={outputText}
          lines={8}
          readOnly
        />
      </Column>


      <Row as="footer" fillWidth padding="8" horizontal="center" s={{ direction: "column" }}>
        <Row
          maxWidth="m"
          paddingY="8"
          paddingX="16"
          gap="16"
          horizontal="between"
          vertical="center"
          s={{
            direction: "column",
            horizontal: "center",
            align: "center",
          }}
        >
          <Text variant="body-default-s" onBackground="neutral-strong">
            <Text onBackground="neutral-weak">© 2026 /</Text>
            <Text paddingX="4">Kyle Moy</Text>
          </Text>
          <Row gap="16">
            <IconButton
              key="GitHub"
              href="https://github.com/kylelmoy/glyph-weaver"
              icon="github"
              tooltip="kylelmoy/glyph-weaver on GitHub"
              size="s"
              variant="ghost"
            />
            <IconButton
              key="LinkedIn"
              href="https://www.linkedin.com/in/kylelmoy/"
              icon="linkedin"
              tooltip="Kyle Moy on LinkedIn"
              size="s"
              variant="ghost"
            />
            <IconButton
              key="Bio"
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
