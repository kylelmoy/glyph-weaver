"use client";

import {
  Heading,
  Text,
  Button,
  Column,
  Badge,
  Logo,
  Line,
  LetterFx,
  Textarea,
  Row,
} from "@once-ui-system/core";
import { useState } from "react";

export default function Home() {
  const [textareaCount, setTextareaCount] = useState(2);

  const increaseTextareas = () => setTextareaCount((prev) => prev + 1);
  const decreaseTextareas = () =>
    setTextareaCount((prev) => (prev > 1 ? prev - 1 : 1));

  return (
    <Column fillWidth padding="l" gap="s" style={{ minHeight: "100vh" }}>
      {[...Array(textareaCount)].map((_, index) => (
        <Textarea
          key={`textarea-${index}`}
          id={`textarea-${index}`}
          label={`Input ${index + 1}`}
          placeholder={`Enter input ${index + 1}`}
          lines={3}
        />
      ))}
      <Button onClick={increaseTextareas}>Add Textarea</Button>
      <Button onClick={decreaseTextareas}>Remove Textarea</Button>
    </Column>
  );
}
