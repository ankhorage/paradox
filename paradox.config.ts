/***
 * Canonical Paradox configuration for this package.
 *
 * @config
 * @readme
 */
import { defineParadoxConfig } from './src/config/defineParadoxConfig.js';

export default defineParadoxConfig({
  mode: 'write',

  collaborators: true,

  donation: {
    account: 'ankhorage',
  },

  package: {
    entrypoints: ['src/index.ts'],
  },

  output: {
    dir: 'paradox',
  },
});
