import { dirname } from 'node:path';

import { analyze } from './analyze/analyze.js';
import { buildModel } from './model/buildModel.js';
import {
  findParadoxConfigFile,
  loadParadoxConfig,
  resolveOutputRoot,
  resolvePackageRoot,
} from './paths/policy.js';
import { render } from './render/render.js';
import { write } from './write/write.js';

export interface RunParadoxOptions {
  readonly cwd?: string;
}

export async function runParadox(options: RunParadoxOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
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

  const analysis = await analyze(config, { packageRoot });
  const model = buildModel(analysis);
  const result = render(model, { outputDir });

  await write(result, config, { packageRoot, outputRoot });
}
