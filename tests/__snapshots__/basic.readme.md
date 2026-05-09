# Fixture Docs

Generated fixture docs.

## Usage

```bash
bunx @fixture/basic
```

## Configuration

Create a `basic.config.ts` file:

```ts
import type { ToolConfig } from '@fixture/basic';

const config = {
  // ...
} satisfies ToolConfig;

export default config;
```

## Path resolution

- Config discovery: searches upward from `process.cwd()` for `paradox.config.ts/js/mjs/cjs` (required; no fallback).
- Package root: defaults to the directory containing `paradox.config.*`; `package.root` (when relative) resolves relative to that directory.
- Output directory: defaults to `paradox/`; `output.dir` (when relative) resolves relative to the resolved package root and must stay inside it.
- Modes:
  - `safe`: writes generated artifacts only under the output directory
  - `write`: additionally updates `<packageRoot>/README.md`

## Public API

### Button

Renders the fixture button component.

### ButtonProps

Props accepted by the fixture button.

### ToolConfig

Configuration for the fixture package.