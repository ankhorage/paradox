#!/usr/bin/env bun
import { dirname } from 'node:path';

import { analyze } from '../analyze/analyze.js';
import { buildModel } from '../model/buildModel.js';
import {
  findParadoxConfigFile,
  loadParadoxConfig,
  resolveOutputRoot,
  resolvePackageRoot,
} from '../paths/policy.js';
import { render } from '../render/render.js';
import { write } from '../write/write.js';

/***
 * Runs the Paradox CLI.
 *
 * The command discovers the nearest Paradox config, resolves the package and output roots,
 * analyzes the package, builds the documentation model, renders all documentation artifacts,
 * and writes them to the configured output directory.
 */
async function main(): Promise<void> {
  const cwd = process.cwd();
  const configFilePath = await findParadoxConfigFile(cwd);
  if (!configFilePath) {
    throw new Error(
      `Unable to find Paradox config. Looked for paradox.config.{ts,js,mjs,cjs} by searching upward from: ${cwd}`,
    );
  }

  const configDir = dirname(configFilePath);
  const config = await loadParadoxConfig(configFilePath);

  const packageRoot = await resolvePackageRoot(config, configDir);
  const { outputDir, outputRoot } = resolveOutputRoot(config, packageRoot);

  const analysis = await analyze(config, { packageRoot, configFilePath });
  assertNoDocumentationErrors(analysis.findings);
  const model = buildModel(analysis);
  const result = render(model, { outputDir });

  await write(result, config, { packageRoot, outputRoot });
}

/***
 * Refuses to write generated artifacts when canonical documentation policy contains errors.
 */
function assertNoDocumentationErrors(
  findings: readonly { severity: 'warning' | 'error'; ruleId: string; message: string }[],
): void {
  const errors = findings.filter((finding) => finding.severity === 'error');
  if (errors.length === 0) return;

  const details = errors.map((finding) => `- [${finding.ruleId}] ${finding.message}`).join('\n');
  throw new Error(`Paradox documentation policy is invalid:\n${details}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
