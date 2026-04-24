import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { ParadoxConfig } from '../config/types.js';
import { analyzeComponents } from './components.js';
import { analyzeExports } from './exports.js';
import { createProject } from './project.js';
import type { AnalysisResult } from './types.js';

/***
 * Runs the source analysis pipeline for a configured package.
 */
export async function analyze(config: ParadoxConfig): Promise<AnalysisResult> {
  const root = config.package?.root ?? process.cwd();

  const pkg = await readPackageJson(root);
  const usage = pkg.bin
    ? {
        command: `bunx ${pkg.name}`,
      }
    : null;

  const project = createProject(root);
  const entrypoints = config.package?.entrypoints ?? ['src/index.ts'];

  const { config: configMetadata, exports } = analyzeExports(project, {
    root,
    entrypoints,
  });
  const components = analyzeComponents(exports);

  return {
    packageName: config.docs?.title ?? pkg.name,
    packageId: pkg.name,
    description: config.docs?.description ?? pkg.description ?? null,

    exports,
    components,
    usage,
    config: configMetadata,
  };
}

async function readPackageJson(root: string): Promise<{
  name: string;
  description?: string;
  bin?: string | Record<string, string>;
}> {
  const raw = await readFile(join(root, 'package.json'), 'utf-8');

  return JSON.parse(raw) as {
    name: string;
    description?: string;
    bin?: string | Record<string, string>;
  };
}
