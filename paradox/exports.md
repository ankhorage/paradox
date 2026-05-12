# Public API

## defineParadoxConfig

Kind: `function`
Module: `src/config/defineParadoxConfig.ts`
Source: `src/config/defineParadoxConfig.ts:8:1`

Defines a Paradox configuration object without changing its shape.

### Signatures

- `(config: ParadoxConfig) => ParadoxConfig`
  - config: `ParadoxConfig`
  - returns: `ParadoxConfig`

## getParadoxDocTag

Kind: `function`
Module: `src/doc-tags/registry.ts`
Source: `src/doc-tags/registry.ts:42:1`

Looks up documentation tag metadata by tag name.

### Signatures

- `(name: string) => { readonly name: "readme"; readonly syntax: "@readme"; readonly description: "Includes a documentation block or exported symbol in README output."; readonly appliesTo: readonly ["block", "symbol"]; readonly repeatable: false; readonly handler: "markReadme"; } | { readonly name: "config"; readonly syntax: "@config"; readonly description: "Marks a type or interface as part of the Paradox configuration model. @config alone does not imply README inclusion; use @config plus @readme for README output."; readonly appliesTo: readonly ["interface", "type"]; readonly repeatable: false; readonly handler: "markConfig"; } | { readonly name: "example"; readonly syntax: "@example"; readonly description: "Adds a titled fenced code example to the generated documentation for a symbol."; readonly appliesTo: readonly ["symbol"]; readonly repeatable: true; readonly handler: "parseExample"; } | null`
  - name: `string`
  - returns: `{ readonly name: "readme"; readonly syntax: "@readme"; readonly description: "Includes a documentation block or exported symbol in README output."; readonly appliesTo: readonly ["block", "symbol"]; readonly repeatable: false; readonly handler: "markReadme"; } | { readonly name: "config"; readonly syntax: "@config"; readonly description: "Marks a type or interface as part of the Paradox configuration model. @config alone does not imply README inclusion; use @config plus @readme for README output."; readonly appliesTo: readonly ["interface", "type"]; readonly repeatable: false; readonly handler: "markConfig"; } | { readonly name: "example"; readonly syntax: "@example"; readonly description: "Adds a titled fenced code example to the generated documentation for a symbol."; readonly appliesTo: readonly ["symbol"]; readonly repeatable: true; readonly handler: "parseExample"; } | null`

## isParadoxDocTagName

Kind: `function`
Module: `src/doc-tags/registry.ts`
Source: `src/doc-tags/registry.ts:49:1`

Checks whether a string is a supported Paradox documentation tag name.

### Signatures

- `(name: string) => boolean`
  - name: `string`
  - returns: `boolean`

## PARADOX_DOC_TAGS

Kind: `value`
Module: `src/doc-tags/registry.ts`
Source: `src/doc-tags/registry.ts:8:14`

Supported Paradox documentation tags.

Paradox supports doc tags inside triple-star documentation comments.

## ParadoxConfig

Kind: `type`
Module: `src/config/types.ts`
Source: `src/config/types.ts:7:1`

Configuration for running Paradox.

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| docs | property | `{ title?: string; description?: string; } \| undefined` | no |  |
| mode | property | `"safe" \| "write" \| undefined` | no |  |
| output | property | `{ dir?: string; } \| undefined` | no |  |
| package | property | `{ root?: string; entrypoints?: string[]; } \| undefined` | no |  |

## ParadoxDocTagHandlerId

Kind: `unknown`
Module: `src/doc-tags/registry.ts`
Source: `src/doc-tags/registry.ts:37:1`

## ParadoxDocTagName

Kind: `unknown`
Module: `src/doc-tags/registry.ts`
Source: `src/doc-tags/registry.ts:36:1`
