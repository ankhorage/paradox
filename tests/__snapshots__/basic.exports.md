# Public API

## Button

Kind: `function`
Module: `src/ui.ts`
Source: `src/ui.ts:28:1`

Renders the fixture button component.

### Signatures

- `(props: ButtonProps) => JSX.Element`
  - props: `ButtonProps` — Props that configure the rendered button state.
  - returns: `JSX.Element` — The rendered JSX element descriptor.

## ButtonProps

Kind: `type`
Module: `src/ui.ts`
Source: `src/ui.ts:10:1`

Props accepted by the fixture button.

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| disabled | property | `boolean \| undefined` | no | Optional disabled state. |
| label | property | `string` | yes | Visible button label. |

## createButtonState

Kind: `function`
Module: `src/ui.ts`
Source: `src/ui.ts:41:1`

Builds button props from raw inputs.

### Signatures

- `(label: string) => ButtonProps`
  - label: `string` — Visible button label.
  - returns: `ButtonProps` — A normalized button props object.
- `(label: string, disabled: boolean) => ButtonProps`
  - disabled: `boolean` — Whether the button should be disabled.
  - label: `string` — Visible button label.
  - returns: `ButtonProps` — A normalized button props object.
- `(label: string, disabled?: boolean) => ButtonProps`
  - disabled: `boolean` (optional) — Whether the button should be disabled.
  - label: `string` — Visible button label.
  - returns: `ButtonProps` — A normalized button props object.

## ToolConfig

Kind: `type`
Module: `src/config.ts`
Source: `src/config.ts:6:1`

Configuration for the fixture package.

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| enabled | property | `boolean` | yes |  |
