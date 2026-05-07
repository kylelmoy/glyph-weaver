# Glyph Weaver

A browser-based text transformation playground built on a visual node graph. Wire together operations to sort, filter, transform, and combine text — and watch the output update in real time.

**Live:** [glyph.kylelmoy.com](https://glyph.kylelmoy.com)

---

## How it works

Pipelines are directed acyclic graphs (DAGs) on an interactive canvas. Text flows from **Input** nodes through **Operation** nodes to **Output** nodes. Every change — typing, connecting, tweaking a parameter — updates all outputs instantly.

### Node types

**Input** — A resizable textarea that feeds text into the pipeline. Multiple input nodes can exist on the same canvas; each is independent. Supports loading text directly from a file.

**Operation** — Applies one transformation to the text it receives. Operations can have configurable parameters (search term, delimiter, column index, etc.). Move nodes up or down in a chain with the arrow buttons.

**Output** — A read-only tap that displays the computed text at that point in the pipeline. Any node can be a tap — useful for inspecting intermediate results. Output nodes can copy their text to the clipboard or download it as a `.txt` file.

### Canvas interactions

| Action | Result |
|---|---|
| Click an operation in the palette | Splices it between the selected node and its children |
| **Shift** + click an operation | Branches from the selected node instead of splicing |
| Drag a node | Repositions it; snaps to a 50px grid |
| Drag an edge handle | Draws a new connection |
| Drag an existing edge | Reconnects it to a different target |
| **Delete** key | Removes the selected node, bridging its edges |
| **Shift** + hover remove button | Previews cascade deletion (node + all descendants) |
| **Shift** + click remove button | Executes cascade deletion |

### Set operations

**Union**, **Intersection**, **Difference**, and **Symmetric Difference** each accept two inputs via labeled **A** and **B** handles, letting you merge or compare the outputs of separate pipeline branches.

---

## Operations

| Category | Operations |
|---|---|
| **Sorting** | Sort A→Z, Sort Z→A, Sort Numerically ↑, Sort Numerically ↓, Sort by Length ↑, Sort by Length ↓, Reverse Order, Shuffle |
| **Filtering** | Remove Duplicates, Remove Empty, Remove Containing, Keep Containing, Keep Matching Regex, Remove Matching Regex, Keep First N Lines, Keep Last N Lines |
| **Case** | UPPERCASE, lowercase, Title Case, camelCase, snake_case, kebab-case |
| **Edit** | Trim Whitespace, Collapse Whitespace, Add Prefix, Add Suffix, Find and Replace, Regex Find & Replace, Extract Regex Match, Number Lines, Wrap in Quotes, Join Lines, Split by Delimiter, URL Encode, URL Decode, Base64 Encode, Base64 Decode |
| **Format** | Extract TSV Column, Sort by TSV Column, TSV → CSV, CSV → TSV, TSV → JSON Array, Lines → JSON Array, JSON Array → Lines, JSON Pretty Print, JSON Minify |
| **Set** | Union (∪), Intersection (∩), Difference (−), Symmetric Difference (△) |
| **Custom** | Custom Expression — evaluates a JavaScript expression per line (`line` holds the current value) |

---

## Persistence

The active pipeline auto-saves to `localStorage` on every change and is restored on next visit. Named snapshots can be saved, loaded, and deleted from the bottom of the operations panel.

---

## Development

```bash
npm install
npm run dev          # start dev server (Turbopack)
npm run build        # production build
```

### Stack

- [Next.js 16](https://nextjs.org/) + React 19
- [React Flow (XYFlow)](https://reactflow.dev/) — canvas and graph engine
- [Once UI](https://once-ui.com/) — design system and components
- TypeScript 5
