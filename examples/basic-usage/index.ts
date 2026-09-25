import { defineParadoxConfig } from '../../src/index.js';

/***
 * @title Basic Usage
 *
 * Paradox generates documentation from the canonical package structure. Usage documentation lives
 * only below `examples/**` or `src/cli/**`. A repository may contain multiple `@usage`
 * examples, but exactly one example below `examples/**` is promoted into README with `@readme`.
 *
 * README-promoted usage provides an explicit `@title` and non-empty prose. Code always comes from
 * real source declarations rather than duplicated code blocks inside Paradox comments.
 *
 * @usage
 * @readme
 */
export const basicConfig = defineParadoxConfig({
  mode: 'safe',
});
