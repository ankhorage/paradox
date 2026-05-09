import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { ParadoxConfig } from '../config/types.js';
import { analyzeBadges } from './badges.js';
import { analyzeComponents } from './components.js';
import { analyzeExports } from './exports.js';
import { analyzeModules } from './modules.js';
import { createProject } from './project.js';
import type { AnalysisResult } from './types.js';
import { createUsageFromPackageJson, type PackageJsonModel } from './usage.js';

/***
 * Runs the source analysis pipeline for a configured package.
 */
export async function analyze(
  config: ParadoxConfig,
  runtime: { packageRoot: string },
): Promise<AnalysisResult> {
  const root = runtime.packageRoot;

  const pkg = await readPackageJson(root);
  const usage = createUsageFromPackageJson(pkg);
  const badges = await analyzeBadges(root, pkg);

  const project = createProject(root);
  const entrypoints = config.package?.entrypoints ?? ['src/index.ts'];

  const { config: configMetadata, exports } = analyzeExports(project, {
    root,
    entrypoints,
  });
  const components = analyzeComponents(exports);
  const modules = analyzeModules(project, {
    root,
    entrypoints,
  });

  return {
    packageName: config.docs?.title ?? pkg.name,
    packageId: pkg.name,
    description: config.docs?.description ?? pkg.description ?? null,

    exports,
    components,
    entrypoints: entrypoints.map((entrypoint) => entrypoint.replaceAll('\\', '/')).sort(),
    modules,
    badges,
    usage,
    config: configMetadata,
  };
}

async function readPackageJson(root: string): Promise<PackageJsonModel> {
  const raw = await readFile(join(root, 'package.json'), 'utf-8');

  return JSON.parse(raw) as PackageJsonModel;
}
