#!/usr/bin/env bun
import { runParadox } from './run.js';

/***
 * Runs the Paradox CLI.
 *
 * The command discovers the nearest Paradox config, resolves the package and output roots,
 * analyzes the package, builds the documentation model, renders all documentation artifacts,
 * and writes them to the configured output directory.
 *
 * @readme
 */
async function main(): Promise<void> {
  await runParadox();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
