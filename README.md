# @ankhorage/paradox

Deterministic documentation generator for TypeScript packages.

## Usage

```bash
bunx @ankhorage/paradox
```

## Configuration

Create a `paradox.config.ts` file:

```ts
import { defineParadoxConfig } from '@ankhorage/paradox';

export default defineParadoxConfig({
  // ...
});
```

## Path resolution

- Config discovery: searches upward from `process.cwd()` for `paradox.config.ts/js/mjs/cjs` (required; no fallback).
- Package root: defaults to the directory containing `paradox.config.*`; `package.root` (when relative) resolves relative to that directory.
- Output directory: defaults to `paradox/`; `output.dir` (when relative) resolves relative to the resolved package root and must stay inside it.
- Modes:
  - `safe`: writes generated artifacts only under the output directory
  - `write`: additionally updates `<packageRoot>/README.md`

## Public API

### defineParadoxConfig

Defines a Paradox configuration object without changing its shape.

### ParadoxConfig

Configuration for running Paradox.
