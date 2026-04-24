#!/usr/bin/env bun
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { analyze } from './analyze/analyze.js';
import type { ParadoxConfig } from './config/types.js';
import { buildModel } from './model/buildModel.js';
import { render } from './render/render.js';
import { write } from './write/write.js';

async function main(): Promise<void> {
  const config = await loadConfig(process.cwd());
  const analysis = await analyze(config);
  const model = buildModel(analysis);
  const result = render(model);

  await write(result, config);
}

async function loadConfig(root: string): Promise<ParadoxConfig> {
  const configUrl = pathToFileURL(join(root, 'paradox.config.ts')).href;
  const mod = (await import(configUrl)) as { default?: ParadoxConfig };

  return mod.default ?? {};
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
