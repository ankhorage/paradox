import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { resolvePolicyStatus } from '@ankhorage/policy/status';

import { validateCollaborators } from '../config/utils/validateCollaborators.js';
import { validateDonationAccount } from '../config/utils/validateDonationAccount.js';
import type { ParadoxConfig } from '../types/config.js';
import { analyzeBadges } from './badges.js';
import { analyzeComponents } from './components.js';
import { collectDocumentationCommentsAsync } from './documentation/collectDocumentationCommentsAsync.js';
import { validateDocumentationPolicyAsync } from './documentation/validateDocumentationPolicyAsync.js';
import { analyzeExports } from './exports.js';
import { analyzeModules } from './modules.js';
import { createProject } from './project.js';
import { analyzeReadmeConfig } from './readmeConfig.js';
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
 * Analyzes a package and returns documentation plus canonical policy findings.
 */
export async function analyze(
  config: ParadoxConfig,
  runtime: { packageRoot: string; configFilePath?: string },
): Promise<AnalysisResult> {
  const root = runtime.packageRoot;
  const pkg = await readPackageJson(root);
  const collaborators = validateCollaborators(config.collaborators);
  const donation =
    config.donation === undefined
      ? null
      : { account: validateDonationAccount(config.donation.account) };
  const usage = createUsageFromPackageJson(pkg);
  const project = createProject(root);
  const entrypoints = config.package?.entrypoints ?? ['src/index.ts'];
  const program = createTypeScriptProgram({ root, entrypoints, project });
  const { config: configMetadata, exports } = analyzeExports(project, { root, entrypoints });
  const components = analyzeComponents(exports, { program });
  const modules = analyzeModules(project, { root, entrypoints });
  const sourceFunctions = analyzeSourceFunctions(project, root);
  const sequenceScenarios = analyzeSequenceScenarios({ project, root, pkg, exports });
  const usageEntries = await analyzeReadmeUsage({ root });
  const comments = await collectDocumentationCommentsAsync(root);
  const readmeConfig = await analyzeReadmeConfig({
    root,
    configFilePath: runtime.configFilePath ?? null,
  });
  const configMembers = collectConfigMembers(program, exports, configMetadata);
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
  const findings = await validateDocumentationPolicyAsync({
    root,
    project,
    comments,
    exports,
  });
  const documentationStatus = resolvePolicyStatus(findings);
  const badges = await analyzeBadges(root, pkg, documentationStatus.status);

  return {
    packageName: config.docs?.title ?? pkg.name,
    packageId: pkg.name,
    description: config.docs?.description ?? pkg.description ?? null,
    collaborators,
    donation,
    exports,
    components,
    sourceFunctions,
    entrypoints: entrypoints.map((entrypoint) => entrypoint.replaceAll('\\', '/')).sort(),
    modules,
    badges,
    sequenceScenarios,
    usage,
    usageEntries,
    findings,
    readmeConfig,
    config:
      configMetadata === null
        ? null
        : {
            exportName: configMetadata.exportName,
            title: configMetadata.title,
            description: configMetadata.description,
            isReadme: configMetadata.isReadme,
            members: mapTypeMembers(configMembers),
          },
    graphs,
  };
}

/***
 * Resolves member metadata for the public configuration root when one exists.
 */
function collectConfigMembers(
  program: ReturnType<typeof createTypeScriptProgram>,
  exports: AnalysisResult['exports'],
  configMetadata: {
    exportName: string;
    title: string | null;
    description: string | null;
    isReadme: boolean;
  } | null,
): ReturnType<typeof collectTypeMembers> {
  if (configMetadata === null) return [];

  const configExport = exports.find((entry) => entry.name === configMetadata.exportName);
  if (
    configExport === undefined ||
    (configExport.kind !== 'type' && configExport.kind !== 'unknown')
  ) {
    return [];
  }

  return collectTypeMembers(
    program,
    resolveTypeReference(program, configExport.node) ?? {
      type: configExport.node.getType(),
      name: configExport.name,
      sourcePath: configExport.modulePath,
      symbol: configExport.node.getSymbol() ?? null,
    },
  );
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
