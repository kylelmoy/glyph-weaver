# Glyph Weaver

A browser-based text transformation playground. Build pipelines of operations — sort, filter, find & replace, add prefixes, run custom JS expressions, and more — and watch the output update in real time.

**Live:** [glyph.kylelmoy.com](https://glyph.kylelmoy.com)

---

## How it works

Paste text into the **Input** box, add operations from the **Operations** palette, and read the result in the **Output** box. Operations run sequentially — the output of each step feeds into the next.

Pipelines can be named and saved to the browser's `localStorage`, then loaded or deleted later.

### Available operations

| Category | Operations |
|---|---|
| Sorting | Sort A→Z, Sort Z→A, Sort Numerically ↑↓, Sort by Length ↑↓, Reverse Order, Shuffle |
| Filtering | Remove Duplicates, Remove Empty Lines, Remove/Keep Lines Containing, Remove/Keep Lines Matching Regex, Keep First/Last N Lines |
| Whitespace | Trim Whitespace, Collapse Whitespace |
| Case | Uppercase, Lowercase, Title Case, camelCase, snake_case, kebab-case |
| Transformation | Add Prefix, Add Suffix, Find and Replace, Number Lines, Wrap in Quotes, Join Lines, Split by Delimiter, URL Encode, URL Decode, Custom Expression |

**Custom Expression** evaluates an arbitrary JavaScript expression per line — the variable `line` holds the current line value. Errors on individual lines are silently skipped.

---

## Development

```bash
npm install
npm run dev       # start dev server with Turbopack
npm run build     # production build
npm run biome-write  # auto-format with Biome
```

### Stack

- [Next.js 16](https://nextjs.org/) with React 19
- [Once UI](https://once-ui.com/) design system
- TypeScript 5, Biome