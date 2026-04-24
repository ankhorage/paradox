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

## Public API

### Button

Renders the fixture button component.

### ButtonProps

Props accepted by the fixture button.

### ToolConfig

Configuration for the fixture package.
