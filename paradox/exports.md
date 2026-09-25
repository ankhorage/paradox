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
Source: `src/doc-tags/registry.ts:45:1`

Looks up documentation tag metadata by tag name.

### Signatures

- `(name: string) => ParadoxDocTag | null`
  - name: `string`
  - returns: `ParadoxDocTag | null`

## isParadoxDocTagName

Kind: `function`
Module: `src/doc-tags/registry.ts`
Source: `src/doc-tags/registry.ts:52:1`

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
Source: `src/doc-tags/registry.ts:32:14`

Supported Paradox documentation tags projected from the canonical Ankhorage documentation policy.

## Configuration

Symbol: `ParadoxConfig`

Kind: `type`
Module: `src/types/config.ts`
Source: `src/types/config.ts:9:1`

Configures Paradox documentation generation for a package.

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| collaborators | property | `true \| undefined` | no |  |
| docs | property | `{ title?: string; description?: string; } \| undefined` | no |  |
| donation | property | `{ account: string; } \| undefined` | no |  |
| mode | property | `"safe" \| "write" \| undefined` | no |  |
| output | property | `{ dir?: string; } \| undefined` | no |  |
| package | property | `{ root?: string; entrypoints?: string[]; } \| undefined` | no |  |

## ParadoxDocTagHandlerId

Kind: `unknown`
Module: `src/doc-tags/registry.ts`
Source: `src/doc-tags/registry.ts:40:1`

## ParadoxDocTagName

Kind: `unknown`
Module: `src/doc-tags/registry.ts`
Source: `src/doc-tags/registry.ts:39:1`
