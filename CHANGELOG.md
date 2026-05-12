# Changelog

## 0.1.3

### Patch Changes

- 919d454: Render README CLI entries as per-command accordions and show sequence diagrams directly inside the expanded command section.

## 0.1.2

### Patch Changes

- 9dc0fd2: Add sequence diagram of bin script to README.md

## 0.1.1

### Patch Changes

- 3a7c982: Render sequence diagrams from call flow instead of import topology.

## 0.1.0

### Minor Changes

- dd41897: Generate compact README docs from `@readme` symbols.

## 0.0.10

### Patch Changes

- 46bc15e: Add a reusable semantic TypeScript analysis foundation for exports, props, type members, and graph metadata.

## 0.0.9

### Patch Changes

- 8904673: Handle exports and type members without declaration nodes defensively during analysis.

## 0.0.8

### Patch Changes

- 46fd38d: Render Mermaid diagrams visually in the generated static documentation app.

  The generated `paradox/index.html` now loads Mermaid in the browser, renders diagram blocks visually, and keeps the raw Mermaid source available in a collapsible section for offline fallback, copying, and debugging.

## 0.0.7

### Patch Changes

- 5246138: Generate deterministic README quality badges from local repository metadata.

  Paradox now computes README badge metadata from local package, TypeScript, linting, formatting, workflow, test, coverage, and documentation signals, then renders stable local SVG badge assets under `paradox/badges/` and includes them in generated README output without relying on external badge services.

## 0.0.6

### Patch Changes

- 1a836cf: Generate a deterministic static documentation app with computed API metadata and Mermaid diagrams.

  Paradox now emits an offline `paradox/index.html` documentation app, diagram artifacts, richer export metadata, function signature details, parameter and return descriptions, related symbols, and README links to the generated documentation outputs.

## 0.0.5

### Patch Changes

- 859c537: Standardize CI/release workflow files and update the Bun tooling baseline.

## 0.0.4

### Patch Changes

- f5b89ce: Stabilize Paradox config discovery and output path resolution so generated artifacts are written under the resolved package output directory.

## 0.0.3

### Patch Changes

- d9fb959: Stabilize usage metadata, documentation model serialization, deterministic output ordering, and package entrypoint exports.

## 0.0.1

### Patch Changes

- 17729fb: Add generated README usage and configuration sections from package metadata and `@config` doc tags.

## 0.0.0

### Initial Changes

- Bootstrap Paradox with a TypeScript documentation pipeline: analyze, model, render, and write.
- Add generated README and package export artifacts under `paradox/`.
- Add repository config, CI validation, linting, formatting, typechecking, and bun tests.

All notable changes to this project will be documented in this file.

The format is based on Changesets and the package changelog generated during release.
