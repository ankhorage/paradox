import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { ParadoxConfig } from '../config/types.js';
import { analyzeBadges } from './badges.js';
import { analyzeComponents } from './components.js';
import { analyzeExports } from './exports.js';
import { analyzeModules } from './modules.js';
import { createProject } from './project.js';
import { analyzeReadmeUsage } from './readmeUsage.js';
import { createTypeScriptProgram } from './semantic/createTypeScriptProgram.js';
import { collectTypeMembers, resolveTypeReference } from './semantic/exports.js';
import {
  collectCallGraph,
  collectComponentCompositionGraph,
  collectImportGraph,
} from './semantic/graphs.js';
import { analyzeSequenceScenarios } from './sequenceScenarios.js';
import { analyzeSourceFunctions } from './sourceFunctions.js';
import type { AnalysisResult } from './types.js';
import { createUsageFromPackageJson, type PackageJsonModel } from './usage.js';

/***
 * Analyzes a package and returns the complete documentation input model.
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
  const usageEntryPoints = config.docs?.usage?.entrypoints ?? [];
  const readmeUsage = await analyzeReadmeUsage({ root, entrypoints: usageEntryPoints });
  const program = createTypeScriptProgram({ root, entrypoints, project });
  const { config: configMetadata, exports } = analyzeExports(project, { root, entrypoints });
  const components = analyzeComponents(exports, { program });
  const modules = analyzeModules(project, {
    root,
    entrypoints,
    excludePaths: usageEntryPoints,
  });
  const sourceFunctions = analyzeSourceFunctions(project, root);
  const sequenceScenarios = analyzeSequenceScenarios({ project, root, pkg, exports });
  const configExport = configMetadata
    ? (exports.find((entry) => entry.name === configMetadata.exportName) ?? null)
    : null;
  const configMembers =
    configExport && (configExport.kind === 'type' || configExport.kind === 'unknown')
      ? collectTypeMembers(
          program,
          resolveTypeReference(program, configExport.node) ?? {
            type: configExport.node.getType(),
            name: configExport.name,
            sourcePath: configExport.modulePath,
            symbol: configExport.node.getSymbol() ?? null,
          },
        )
      : [];
  const graphs = {
    imports: collectImportGraph(program),
    calls: collectCallGraph(program),
    typeReferences: exports.flatMap((entry) =>
      entry.relatedSymbols.map((symbol) => ({
        fromSymbol: entry.name,
        toType: symbol,
        sourcePath: entry.modulePath,
      })),
    ),
    componentComposition: collectComponentCompositionGraph(program),
  };

  return {
    packageName: config.docs?.title ?? pkg.name,
    packageId: pkg.name,
    description: config.docs?.description ?? pkg.description ?? null,
    exports,
    components,
    sourceFunctions,
    entrypoints: entrypoints.map((entrypoint) => entrypoint.replaceAll('\\', '/')).sort(),
    modules,
    badges,
    sequenceScenarios,
    usage,
    readmeUsage,
    config: configMetadata
      ? {
          exportName: configMetadata.exportName,
          isReadme: configMetadata.isReadme,
          members: mapTypeMembers(configMembers),
        }
      : null,
    graphs,
  };
}

interface AnalysisTypeMemberOutput {
  name: string;
  type: string;
  required: boolean;
  description: string | null;
  defaultValue?: string;
  inheritedFrom?: string;
  children?: ReturnType<typeof mapTypeMembers>;
}

/***
 * Converts semantic type members into serializable analysis output.
 */
function mapTypeMembers(
  members: readonly ReturnType<typeof collectTypeMembers>[number][],
): AnalysisTypeMemberOutput[] {
  return members.map((member) => ({
    name: member.name,
    type: member.type,
    required: member.required,
    description: member.description ?? null,
    ...(member.defaultValue !== undefined ? { defaultValue: member.defaultValue } : {}),
    ...(member.inheritedFrom !== undefined ? { inheritedFrom: member.inheritedFrom } : {}),
    ...(member.children ? { children: mapTypeMembers(member.children) } : {}),
  }));
}

/***
 * Reads package metadata from the analyzed package root.
 */
async function readPackageJson(root: string): Promise<PackageJsonModel> {
  const raw = await readFile(join(root, 'package.json'), 'utf-8');
  return JSON.parse(raw) as PackageJsonModel;
}
