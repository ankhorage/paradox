import { defineParadoxConfig } from './src/config/defineParadoxConfig.js';

export default defineParadoxConfig({
  mode: 'write',

  docs: {
    title: '@ankhorage/paradox',
    description: 'Deterministic documentation generator for TypeScript packages.',
  },

  package: {
    entrypoints: ['src/index.ts'],
  },

  output: {
    dir: 'paradox',
  },
});
