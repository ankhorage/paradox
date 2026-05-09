# Public API

## defineParadoxConfig

Kind: `function`
Module: `src/config/defineParadoxConfig.ts`
Source: `src/config/defineParadoxConfig.ts:6:1`

Defines a Paradox configuration object without changing its shape.

### Signatures

- `(config: ParadoxConfig) => ParadoxConfig`
  - config: `ParadoxConfig`
  - returns: `ParadoxConfig`

## ParadoxConfig

Kind: `type`
Module: `src/config/types.ts`
Source: `src/config/types.ts:6:1`

Configuration for running Paradox.

### Members

| Name    | Kind     | Type                                                      | Required | Description |
| ------- | -------- | --------------------------------------------------------- | -------- | ----------- |
| docs    | property | `{ title?: string; description?: string; } \| undefined`  | no       |             |
| mode    | property | `"safe" \| "write" \| undefined`                          | no       |             |
| output  | property | `{ dir?: string; } \| undefined`                          | no       |             |
| package | property | `{ root?: string; entrypoints?: string[]; } \| undefined` | no       |             |
