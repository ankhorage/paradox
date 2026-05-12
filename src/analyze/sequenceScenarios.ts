import { isAbsolute, join, normalize } from 'node:path';

import {
  type CallExpression,
  type FunctionDeclaration,
  Node as MorphNode,
  type Project,
  type SourceFile,
} from 'ts-morph';

import { relativeToRoot, toPosixPath } from './semantic/utils.js';
import type { AnalysisExport, AnalysisSequenceScenario } from './types.js';
import { getParadoxComment } from './utils/getParadoxComment.js';
import { parseParadoxComment } from './utils/parseParadoxComment.js';
import type { PackageJsonModel } from './usage.js';

interface AnalyzeSequenceScenariosOptions {
  project: Project;
  root: string;
  pkg: PackageJsonModel;
  exports: readonly AnalysisExport[];
}

interface BinCallableRoot {
  symbolName: string;
  description: string | null;
  isReadme: boolean;
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

    const callableRoot = findTopLevelInvokedLocalCallable(sourceFile);
    if (callableRoot === null) return [];

    return [
      {
        kind: 'bin',
        name: entry.name,
        sourcePath: relativeToRoot(root, sourceFile.getFilePath()),
        symbolName: callableRoot.symbolName,
        description: callableRoot.description,
        isReadme: callableRoot.isReadme,
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
        description: entry.description,
        isReadme: entry.isReadme,
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

function findTopLevelInvokedLocalCallable(sourceFile: SourceFile): BinCallableRoot | null {
  const candidates: FunctionDeclaration[] = [];

  sourceFile.forEachDescendant((node) => {
    if (!MorphNode.isCallExpression(node)) return;
    if (isInsideCallable(node)) return;

    const callableDeclaration = getLocalFunctionDeclarationForCall(sourceFile, node);
    if (callableDeclaration !== null) {
      candidates.push(callableDeclaration);
    }
  });

  const uniqueCandidates = uniqueByFunctionName(candidates);
  const declaration = uniqueCandidates.length === 1 ? uniqueCandidates[0] : undefined;
  if (declaration === undefined) return null;

  const parsedComment = getParsedParadoxComment(declaration);

  return {
    symbolName: declaration.getName() ?? 'main',
    description: parsedComment.description,
    isReadme: parsedComment.isReadme,
  };
}

function getParsedParadoxComment(declaration: FunctionDeclaration): {
  description: string | null;
  isReadme: boolean;
} {
  const comment = getParadoxComment(declaration);
  if (comment === null) {
    return { description: null, isReadme: false };
  }

  const parsed = parseParadoxComment(comment);
  return {
    description: parsed.description,
    isReadme: parsed.isReadme,
  };
}

function getLocalFunctionDeclarationForCall(
  sourceFile: SourceFile,
  node: CallExpression,
): FunctionDeclaration | null {
  const expression = node.getExpression();
  const symbol = expression.getSymbol() ?? expression.getType().getSymbol();
  if (!symbol) return null;

  for (const declaration of symbol.getDeclarations()) {
    if (declaration.getSourceFile().getFilePath() !== sourceFile.getFilePath()) continue;
    if (!MorphNode.isFunctionDeclaration(declaration)) continue;
    return declaration;
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

function uniqueByFunctionName(declarations: readonly FunctionDeclaration[]): FunctionDeclaration[] {
  const seen = new Set<string>();
  return declarations.filter((declaration) => {
    const name = declaration.getName();
    if (name === undefined || seen.has(name)) return false;
    seen.add(name);
    return true;
  });
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
