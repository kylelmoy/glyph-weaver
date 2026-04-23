"use client";

/**
 * PipelineStep — renders a single operation card inside the active pipeline.
 *
 * Displays the step number, operation name, move/remove controls, and any
 * user-configurable parameter inputs defined by the operation. A visual
 * connector line is rendered below every step except the last one.
 */

import { Fragment } from "react";
import { Column, Row, Input, IconButton, Text } from "@once-ui-system/core";
import type { OperationDefinition, PipelineItem } from "@/lib/textOperations";

interface PipelineStepProps {
  item: PipelineItem;
  op: OperationDefinition;
  /** Zero-based position of this step in the pipeline. */
  index: number;
  isFirst: boolean;
  isLast: boolean;
  /** Called when a parameter input changes. */
  onUpdate: (key: string, value: string) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
}

export function PipelineStep({
  item,
  op,
  index,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMove,
}: PipelineStepProps) {
  return (
    <Fragment>
      <Column gap="xs" padding="s" border="neutral-alpha-medium" radius="s">
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
              disabled={isFirst}
              onClick={() => onMove("up")}
            />
            <IconButton
              icon="chevronDown"
              size="s"
              variant="ghost"
              tooltip="Move down"
              disabled={isLast}
              onClick={() => onMove("down")}
            />
            <IconButton
              icon="close"
              size="s"
              variant="ghost"
              tooltip="Remove"
              onClick={onRemove}
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
            onChange={(e) => onUpdate(param.key, e.target.value)}
            height="s"
            style={param.monospace ? { fontFamily: "var(--font-code)" } : undefined}
          />
        ))}
      </Column>

      {/* Connector line between steps — hidden after the last step */}
      {!isLast && (
        <Row fillWidth horizontal="center">
          <Column style={{ width: 2, height: 16 }} background="neutral-alpha-medium" />
        </Row>
      )}
    </Fragment>
  );
}
