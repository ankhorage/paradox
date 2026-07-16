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
Source: `src/doc-tags/registry.ts:53:1`

Looks up documentation tag metadata by tag name.

### Signatures

- `(name: string) => { readonly name: "readme"; readonly syntax: "@readme"; readonly description: "Includes a documentation block or exported symbol in README output."; readonly appliesTo: readonly ["block", "symbol"]; readonly repeatable: false; readonly handler: "markReadme"; } | { readonly name: "config"; readonly syntax: "@config"; readonly description: "Marks a configuration type, interface, or source block. Pair with @readme to include the schema or actual config source in README Configuration output."; readonly appliesTo: readonly ["block", "interface", "type"]; readonly repeatable: false; readonly handler: "markConfig"; } | { readonly name: "example"; readonly syntax: "@example"; readonly description: "Adds a titled fenced code example to the generated documentation for a symbol."; readonly appliesTo: readonly ["symbol"]; readonly repeatable: true; readonly handler: "parseExample"; } | { readonly name: "usage"; readonly syntax: "@usage"; readonly description: "Promotes a real source example into the generated README Usage section."; readonly appliesTo: readonly ["block", "symbol"]; readonly repeatable: false; readonly handler: "markUsage"; } | null`
  - name: `string`
  - returns: `{ readonly name: "readme"; readonly syntax: "@readme"; readonly description: "Includes a documentation block or exported symbol in README output."; readonly appliesTo: readonly ["block", "symbol"]; readonly repeatable: false; readonly handler: "markReadme"; } | { readonly name: "config"; readonly syntax: "@config"; readonly description: "Marks a configuration type, interface, or source block. Pair with @readme to include the schema or actual config source in README Configuration output."; readonly appliesTo: readonly ["block", "interface", "type"]; readonly repeatable: false; readonly handler: "markConfig"; } | { readonly name: "example"; readonly syntax: "@example"; readonly description: "Adds a titled fenced code example to the generated documentation for a symbol."; readonly appliesTo: readonly ["symbol"]; readonly repeatable: true; readonly handler: "parseExample"; } | { readonly name: "usage"; readonly syntax: "@usage"; readonly description: "Promotes a real source example into the generated README Usage section."; readonly appliesTo: readonly ["block", "symbol"]; readonly repeatable: false; readonly handler: "markUsage"; } | null`

## isParadoxDocTagName

Kind: `function`
Module: `src/doc-tags/registry.ts`
Source: `src/doc-tags/registry.ts:60:1`

Checks whether a string is a supported Paradox documentation tag name.

### Signatures

- `(name: string) => boolean`
  - name: `string`
  - returns: `boolean`

## packageMetadata

Kind: `value`
Module: `src/packageMetadata.ts`
Source: `src/packageMetadata.ts:1:14`

## PARADOX_DOC_TAGS

Kind: `value`
Module: `src/doc-tags/registry.ts`
Source: `src/doc-tags/registry.ts:11:14`

| name | syntax | description | applies to | repeatable | handler |
| --- | --- | --- | --- | --- | --- |
| `readme` | `@readme` | Includes a documentation block or exported symbol in README output. | block, symbol | no | `markReadme` |
| `config` | `@config` | Marks a configuration type, interface, or source block. Pair with @readme to include the schema or actual config source in README Configuration output. | block, interface, type | no | `markConfig` |
| `example` | `@example` | Adds a titled fenced code example to the generated documentation for a symbol. | symbol | yes | `parseExample` |
| `usage` | `` | Promotes a real source example into the generated README Usage section. | block, symbol | no | `markUsage` |

## ParadoxConfig

Kind: `type`
Module: `src/config/types.ts`
Source: `src/config/types.ts:7:1`

Configuration for running Paradox.

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| docs | property | `{ title?: string; description?: string; usage?: { description?: string; entrypoints?: string[]; }; } \| undefined` | no |  |
| mode | property | `"safe" \| "write" \| undefined` | no |  |
| output | property | `{ dir?: string; } \| undefined` | no |  |
| package | property | `{ root?: string; entrypoints?: string[]; } \| undefined` | no |  |

## ParadoxDocTagHandlerId

Kind: `unknown`
Module: `src/doc-tags/registry.ts`
Source: `src/doc-tags/registry.ts:48:1`

## ParadoxDocTagName

Kind: `unknown`
Module: `src/doc-tags/registry.ts`
Source: `src/doc-tags/registry.ts:47:1`
