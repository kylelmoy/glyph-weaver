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
import { useState, useMemo, useRef } from "react";
import { OPERATIONS, OPERATION_CATEGORIES, processText } from "@/lib/textOperations";
import type { PipelineItem } from "@/lib/textOperations";

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
  const nextId = useRef(0);

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
        <Column flex={1} gap="s" padding="m" radius="m">
          <Heading variant="heading-strong-xs">Pipeline</Heading>
          {pipeline.length === 0 ? (
            <Text variant="body-default-s" onBackground="neutral-weak">
              Add operations from the panel on the right
            </Text>
          ) : (
            pipeline.map((item, index) => {
              const op = OPERATIONS.find((o) => o.id === item.operationId);
              if (!op) return null;
              return (
                <Column
                  key={item.instanceId}
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
                    />
                  ))}
                </Column>
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
        <Heading variant="heading-strong-xs">Output</Heading>
        <Textarea
          id="output"
          value={outputText}
          lines={8}
          readOnly
        />
      </Column>
    </Column>
  );
}
