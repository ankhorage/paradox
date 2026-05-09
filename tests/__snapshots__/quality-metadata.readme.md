# Quality Metadata Fixture

![license: MIT](./paradox/badges/license.svg) ![npm: v1.2.3](./paradox/badges/npm.svg) ![runtime: bun](./paradox/badges/runtime.svg) ![typescript: strict](./paradox/badges/typescript.svg) ![eslint: checked](./paradox/badges/eslint.svg) ![prettier: checked](./paradox/badges/prettier.svg) ![build: checked](./paradox/badges/build.svg) ![tests: checked](./paradox/badges/tests.svg) ![coverage: 98.4%](./paradox/badges/coverage.svg) ![docs: paradox](./paradox/badges/docs.svg)

Fixture docs for repository metadata badges.

## Generated documentation

- [Interactive documentation app](./paradox/index.html)
- [Public API reference](./paradox/exports.md)
- [Component registry](./paradox/components.md)
- [Architecture overview](./paradox/diagrams/architecture-overview.mmd)
- [Module relationships](./paradox/diagrams/module-relationships.mmd)
- [Export graph](./paradox/diagrams/export-graph.mmd)
- [Entrypoint sequence](./paradox/diagrams/entrypoint-sequence.mmd)

## Architecture preview

```mermaid
graph TD
  package__fixture_quality_metadata["Quality Metadata Fixture"]
  entrypoint_src_index_ts["src/index.ts"]
  package__fixture_quality_metadata --> entrypoint_src_index_ts
  module_src_index_ts["src/index.ts"]
```

## Path resolution

- Config discovery: searches upward from `process.cwd()` for `paradox.config.ts/js/mjs/cjs` (required; no fallback).
- Package root: defaults to the directory containing `paradox.config.*`; `package.root` (when relative) resolves relative to that directory.
- Output directory: defaults to `paradox/`; `output.dir` (when relative) resolves relative to the resolved package root and must stay inside it.
- Modes:
  - `safe`: writes generated artifacts only under the output directory
  - `write`: additionally updates `<packageRoot>/README.md`

## Public API

### example

Example export for badge fixture snapshots.

- Kind: `function`
- Module: `src/index.ts`
- Source: `src/index.ts:4:1`
- Export paths: `src/index.ts`
