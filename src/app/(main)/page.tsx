import Link from "next/link";
import { Badge, Button, Column, Grid, Heading, Icon, Row, Tag, Text } from "@once-ui-system/core";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

const FEATURES = [
  {
    icon: "chevronsLeftRight",
    title: "Visual pipeline canvas",
    description:
      "Stack operations on an infinite drag-and-drop canvas. Connect, reorder, and branch — the graph evaluates in real time.",
  },
  {
    icon: "sparkle",
    title: "40+ built-in operations",
    description:
      "Sort, filter, transform, encode, reformat. Regex replace, JSON pretty-print, CSV conversion, Base64, and custom JS expressions.",
  },
  {
    icon: "eye",
    title: "Instant live preview",
    description:
      "Output updates with every keystroke. Hover any leaf node to illuminate its full pipeline path on the canvas.",
  },
] as const;

export default function Home() {
  return (
    <Column fillWidth style={{ height: "100dvh", overflow: "hidden" }}>
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
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

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <Column
        fillWidth
        horizontal="center"
        vertical="center"
        paddingX="l"
        paddingTop="xl"
        paddingBottom="l"
        gap="64"
        style={{ flex: 1 }}
      >
        {/* Headline block */}
        <Column horizontal="center" gap="32" style={{ maxWidth: 640 }}>
          <Column horizontal="center" gap="16">
            <Heading as="h1" variant="display-strong-l" align="center">
              Transform text,
              <br />
              visually.
            </Heading>
            <Text
              variant="body-default-l"
              onBackground="neutral-weak"
              align="center"
              style={{ maxWidth: 520 }}
            >
              Chain sorting, filtering, formatting, and custom operations on a visual drag-and-drop
              canvas. Results update live as you type.
            </Text>
          </Column>

          <Button id="get-started" href="/app" size="l" arrowIcon>
            Get started
          </Button>
        </Column>

        {/* Feature grid */}
        <Grid columns="3" s={{ columns: 1 }} gap="16" style={{ maxWidth: 900, width: "100%" }}>
          {FEATURES.map((feature) => (
            <Column
              key={feature.title}
              gap="m"
              padding="l"
              border="neutral-alpha-medium"
              radius="l"
              background="neutral-alpha-weak"
              style={{ backdropFilter: "blur(12px)" }}
            >
              <Row
                padding="s"
                radius="m"
                background="brand-alpha-weak"
                border="brand-alpha-weak"
                style={{ width: "fit-content" }}
              >
                <Icon name={feature.icon} size="s" onBackground="brand-medium" />
              </Row>
              <Column gap="xs">
                <Text variant="label-strong-m">{feature.title}</Text>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  {feature.description}
                </Text>
              </Column>
            </Column>
          ))}
        </Grid>
      </Column>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <Row
        fillWidth
        horizontal="center"
        paddingY="m"
        gap="4"
        style={{
          borderTop: "1px solid var(--neutral-alpha-weak)",
          flexShrink: 0,
        }}
      >
        <Text variant="body-default-xs" onBackground="neutral-weak">
          Built by
        </Text>
        <Button
          href="https://www.kylelmoy.com"
          size="s"
          variant="tertiary"
          style={{ padding: 0, height: "auto" }}
        >
          Kyle Moy
        </Button>
      </Row>
    </Column>
  );
}
