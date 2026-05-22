# Ankhorage Agent Guide for `@ankhorage/paradox`

This repository is a strict TypeScript Bun package for deterministic documentation generation from TypeScript source code.

Paradox must remain usable as a standalone documentation generator. It analyzes package entrypoints, extracts structured metadata from TypeScript declarations and Paradox comments, and writes deterministic README/docs/diagram artifacts.

## Non-negotiables

- Do not introduce `any`, `as any`, `unknown as any`, or broad casts to silence errors.
- Do not add `@ts-ignore` / `@ts-expect-error` unless explicitly requested.
- Do not add `eslint-disable` or weaken lint rules/config to make checks pass.
- Do not weaken tsconfig strictness or module resolution settings.
- Do not perform large refactors unless explicitly requested.
- Do not add package-specific assumptions for ZORA, Surface, Studio, runtime, templates, generated apps, or other consumers.
- Do not make generated output nondeterministic.
- Do not add network calls to analysis, docs generation, tests, or validation.
- If you cannot proceed without violating rules, stop and propose two or three options with tradeoffs.

## Required verification

Before concluding any code task, run from repo root:

- `bun run build`
- `bun run lint:fix`
- `bun run test`
- `bun run knip`

For documentation-generator changes, also run:

- `bun run docs`
- `bun run format`
- `git diff --exit-code` after generated output is expected to be committed or validated

For release or packaging-related work, also run:

- `npm pack --dry-run`

If any command fails, stop and report the failure plus the minimal fix.

## Package responsibility

This package owns deterministic documentation generation for TypeScript packages:

- CLI entrypoint and config loading
- TypeScript project analysis via `ts-morph`
- public export discovery from configured entrypoints
- Paradox comment parsing, for example `@readme`, `@config`, `@example`, `@param`, and `@returns`
- generated README and docs output
- generated badges and package metadata output
- generated Mermaid diagrams and export metadata
- validation workflows that make documentation drift visible

This package does not own UI component behavior, app manifest interpretation, runtime rendering, Studio authoring behavior, generated app logic, provider SDK integrations, or deployment orchestration.

## Dependency boundaries

Allowed dependencies should support static analysis, deterministic generation, CLI behavior, or formatting already used by the repository.

Avoid dependencies that are consumer-specific, network-oriented, runtime-rendering-oriented, or heavy when a small deterministic implementation is enough.

If a feature appears to require a consumer-specific dependency, stop and propose a generic metadata or adapter boundary instead.

## Determinism rules

Generated output must be stable across machines and runs.

- Sort generated collections when source order is not intentional.
- Preserve configured order when users explicitly provide one.
- Normalize paths to POSIX-style separators in generated artifacts.
- Avoid timestamps in generated output unless explicitly required and tested.
- Avoid environment-sensitive output unless the environment value is part of the documented contract.
- Keep generated Mermaid and JSON output deterministic.
- Prefer explicit stable IDs over derived values that can drift unexpectedly.

## File and export conventions

Public APIs should be exported from `src/index.ts` with explicit exports.

Build outputs must go to `dist/`. Never write build artifacts into `src/`.

Generated documentation artifacts belong under configured output locations such as `paradox/` and generated README files. Do not mix generated artifacts into source folders.

## Comment and tag rules

Paradox comments use triple-star comments:

```ts
/***
 * Describes the public API.
 *
 * @readme
 */
export function example() {}
```

When changing tag parsing or metadata extraction:

- keep existing tags backward compatible unless a breaking change is explicitly requested
- add or update tests for every supported tag behavior
- document precedence rules when metadata can come from multiple sources
- keep parsing deterministic and whitespace-tolerant
- do not make comments depend on consumer package naming conventions

## README and docs generation rules

Generated README changes should be intentional and deterministic.

When changing README generation:

- update tests where possible
- run `bun run docs`
- inspect generated `README.md`, `paradox/exports.md`, `paradox/paradox.json`, badges, and diagrams when affected
- keep generated prose compact and useful
- avoid marketing claims that are not backed by concrete generator behavior

## Testing rules

Tests must be deterministic and runnable offline.

- Do not perform real network calls.
- Prefer fixture-based tests for parser and generator behavior.
- Cover edge cases for comment parsing, export resolution, config loading, and generated output order.
- Avoid snapshot churn unless the output change is intentional.
- If a fixture changes because generated output changed, explain why in the PR.

## Changesets

If a completed task changes the published package API, CLI behavior, generated output, release behavior, or README in a release-relevant way, create or update a `.changeset/*.md` file before committing that work.

Repo-doc-only changes do not need a changeset unless they affect package release behavior.

Use patch changesets for bug fixes, deterministic-output fixes, documentation updates, and release workflow fixes unless the task explicitly requires a minor or major release.

## Mandatory workflow

1. Plan first: list the exact files you will touch and why.
2. Keep changes micro-scoped: small PR-sized steps, one concern at a time.
3. Do not edit files during planning.
4. Apply changes only after the plan has been approved.
5. After edits, show `git diff --stat` and briefly explain changes.
6. If a step goes sideways, revert to the last checkpoint instead of trial-and-error edits.
7. If a completed task changes the published package, create or update a `.changeset/*.md` file before committing that work.
8. After verification, commit the completed unit of work unless the user explicitly says not to.
