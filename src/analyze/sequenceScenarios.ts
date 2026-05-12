import { isAbsolute, join, normalize } from 'node:path';

import { type CallExpression, Node as MorphNode, type Project, type SourceFile } from 'ts-morph';

import { relativeToRoot, toPosixPath } from './semantic/utils.js';
import type { AnalysisExport, AnalysisSequenceScenario } from './types.js';
import type { PackageJsonModel } from './usage.js';

interface AnalyzeSequenceScenariosOptions {
  project: Project;
  root: string;
  pkg: PackageJsonModel;
  exports: readonly AnalysisExport[];
}

/***
 * Finds scenario roots that can be rendered as sequence diagrams.
 */
export function analyzeSequenceScenarios({
  project,
  root,
  pkg,
  exports,
}: AnalyzeSequenceScenariosOptions): AnalysisSequenceScenario[] {
  return uniqueScenarios([
    ...analyzeBinSequenceScenarios(project, root, pkg),
    ...analyzeExportSequenceScenarios(exports),
  ]);
}

function analyzeBinSequenceScenarios(
  project: Project,
  root: string,
  pkg: PackageJsonModel,
): AnalysisSequenceScenario[] {
  return getBinEntries(pkg).flatMap((entry) => {
    const sourceFile = resolveBinSourceFile(project, root, entry.targetPath);
    if (!sourceFile) return [];

    const symbolName = findTopLevelInvokedLocalCallable(sourceFile);
    if (symbolName === null) return [];

    return [
      {
        kind: 'bin',
        name: entry.name,
        sourcePath: relativeToRoot(root, sourceFile.getFilePath()),
        symbolName,
      },
    ];
  });
}

function analyzeExportSequenceScenarios(
  exports: readonly AnalysisExport[],
): AnalysisSequenceScenario[] {
  return exports.flatMap((entry) => {
    if (entry.signatures.length === 0) return [];

    return [
      {
        kind: 'export',
        name: entry.name,
        sourcePath: entry.modulePath,
        symbolName: entry.name,
      },
    ];
  });
}

function getBinEntries(pkg: PackageJsonModel): { name: string; targetPath: string }[] {
  if (pkg.bin == null) return [];

  if (typeof pkg.bin === 'string') {
    return [
      {
        name: getPackageBaseName(pkg.name),
        targetPath: pkg.bin,
      },
    ];
  }

  return Object.entries(pkg.bin)
    .map(([name, targetPath]) => ({ name, targetPath }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function resolveBinSourceFile(
  project: Project,
  root: string,
  targetPath: string,
): SourceFile | null {
  for (const candidate of getBinSourceCandidates(targetPath)) {
    const sourceFile = getSourceFileByRelativePath(project, root, candidate);
    if (sourceFile) return sourceFile;
  }

  return null;
}

function getBinSourceCandidates(targetPath: string): string[] {
  const normalized = toPosixPath(targetPath).replace(/^\.\//, '');
  const candidates: string[] = [];

  if (/^src\/.*\.tsx?$/.test(normalized)) {
    candidates.push(normalized);
  }

  if (/^dist\/.*\.jsx?$/.test(normalized)) {
    candidates.push(normalized.replace(/^dist\//, 'src/').replace(/\.jsx?$/, '.ts'));
    candidates.push(normalized.replace(/^dist\//, 'src/').replace(/\.jsx?$/, '.tsx'));
  }

  if (/\.jsx?$/.test(normalized)) {
    candidates.push(normalized.replace(/\.jsx?$/, '.ts'));
    candidates.push(normalized.replace(/\.jsx?$/, '.tsx'));
  }

  return uniqueSorted(candidates);
}

function getSourceFileByRelativePath(
  project: Project,
  root: string,
  relativePath: string,
): SourceFile | null {
  const absolutePath = normalize(
    isAbsolute(relativePath) ? relativePath : join(root, relativePath),
  );

  return project.getSourceFile(absolutePath) ?? null;
}

function findTopLevelInvokedLocalCallable(sourceFile: SourceFile): string | null {
  const candidates: string[] = [];

  sourceFile.forEachDescendant((node) => {
    if (!MorphNode.isCallExpression(node)) return;
    if (isInsideCallable(node)) return;

    const callableName = getLocalFunctionNameForCall(sourceFile, node);
    if (callableName !== null) {
      candidates.push(callableName);
    }
  });

  const uniqueCandidates = uniqueSorted(candidates);
  return uniqueCandidates.length === 1 ? (uniqueCandidates[0] ?? null) : null;
}

function getLocalFunctionNameForCall(sourceFile: SourceFile, node: CallExpression): string | null {
  const expression = node.getExpression();
  const symbol = expression.getSymbol() ?? expression.getType().getSymbol();
  if (!symbol) return null;

  for (const declaration of symbol.getDeclarations()) {
    if (declaration.getSourceFile().getFilePath() !== sourceFile.getFilePath()) continue;
    if (!MorphNode.isFunctionDeclaration(declaration)) continue;
    return declaration.getName() ?? null;
  }

  return null;
}

function isInsideCallable(node: CallExpression): boolean {
  return Boolean(
    node.getFirstAncestor(
      (candidate) =>
        MorphNode.isFunctionDeclaration(candidate) ||
        MorphNode.isMethodDeclaration(candidate) ||
        MorphNode.isFunctionExpression(candidate) ||
        MorphNode.isArrowFunction(candidate) ||
        MorphNode.isClassDeclaration(candidate),
    ),
  );
}

function getPackageBaseName(packageName: string): string {
  return packageName.split('/').pop() ?? packageName;
}

function uniqueScenarios(
  scenarios: readonly AnalysisSequenceScenario[],
): AnalysisSequenceScenario[] {
  const seen = new Set<string>();
  return scenarios.filter((scenario) => {
    const key = `${scenario.kind}:${scenario.name}:${scenario.sourcePath}:${scenario.symbolName}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
