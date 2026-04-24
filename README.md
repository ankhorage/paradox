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

## Public API

### defineParadoxConfig

Defines a Paradox configuration object without changing its shape.

### ParadoxConfig

Configuration for running Paradox.
