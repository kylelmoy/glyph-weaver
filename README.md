# Glyph Weaver

A browser-based text transformation playground. Build pipelines of operations — sort, filter, find & replace, add prefixes, run custom JS expressions, and more — and watch the output update in real time.

**Live:** [glyph.kylelmoy.com](https://glyph.kylelmoy.com)

---

## How it works

Paste text into the **Input** box (one item per line), add operations from the **Operations** palette, and read the result in the **Output** box. Operations run sequentially — the output of each step feeds into the next.

Pipelines can be named and saved to the browser's `localStorage`, then loaded or deleted later.

### Available operations

| Category | Operations |
|---|---|
| Sorting | Sort A→Z, Sort Z→A, Sort Numerically ↑↓, Reverse Order |
| Filtering | Remove Duplicates, Remove Empty Lines, Remove Lines Containing, Keep Lines Containing |
| Whitespace | Trim Whitespace |
| Case | Uppercase, Lowercase |
| Transformation | Add Prefix, Add Suffix, Find and Replace, Custom Expression |

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

### Project structure

```
src/
├── app/
│   ├── (main)/
│   │   ├── layout.tsx        # root layout, theme init, metadata
│   │   └── page.tsx          # main page — layout only
│   └── api/og/
│       ├── fetch/            # extracts metadata from a URL (edge)
│       └── proxy/            # proxies external images with cache headers
├── components/
│   ├── Providers.tsx         # Once UI provider stack
│   └── PipelineStep.tsx      # single operation card in the pipeline
├── hooks/
│   └── usePipeline.ts        # all pipeline state and localStorage logic
├── lib/
│   └── textOperations.ts     # operation registry, types, processText()
└── resources/
    ├── icons.ts              # icon library mappings
    ├── once-ui.config.js     # theme and metadata config
    └── custom.css            # CSS custom property overrides
```

---

## License

MIT
