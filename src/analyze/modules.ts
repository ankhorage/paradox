import { isAbsolute, join, normalize, relative } from 'node:path';

import type { Project } from 'ts-morph';

import type { AnalysisModule } from './types.js';

/***
 * Builds a deterministic module relationship graph for documentation renderers.
 */
export function analyzeModules(
  project: Project,
  options: {
    root: string;
    entrypoints: readonly string[];
    excludePaths?: readonly string[];
  },
): AnalysisModule[] {
  const rootPath = normalize(options.root);
  const entrypointPaths = new Set(
    options.entrypoints.map((entrypoint) =>
      normalize(isAbsolute(entrypoint) ? entrypoint : join(options.root, entrypoint)),
    ),
  );
  const excludedPaths = new Set(
    (options.excludePaths ?? []).map((entrypoint) =>
      normalize(isAbsolute(entrypoint) ? entrypoint : join(options.root, entrypoint)),
    ),
  );

  return project
    .getSourceFiles()
    .filter((sourceFile) => {
      const filePath = normalize(sourceFile.getFilePath());
      const normalizedPath = toPosixPath(filePath);
      return (
        !sourceFile.isDeclarationFile() &&
        filePath.startsWith(rootPath) &&
        !excludedPaths.has(filePath) &&
        !normalizedPath.includes('/node_modules/')
      );
    })
    .map((sourceFile) => {
      const path = toPosixPath(relative(options.root, sourceFile.getFilePath()));
      const dependencies = sourceFile
        .getImportDeclarations()
        .map((declaration) => declaration.getModuleSpecifierSourceFile())
        .filter((dependency) => dependency != null)
        .map((dependency) => normalize(dependency.getFilePath()))
        .filter(
          (dependency) =>
            dependency.startsWith(rootPath) &&
            !excludedPaths.has(dependency) &&
            !toPosixPath(dependency).includes('/node_modules/'),
        )
        .map((dependency) => toPosixPath(relative(options.root, dependency)));
      const exports = sourceFile
        .getExportSymbols()
        .map((symbol) => symbol.getName())
        .sort((left, right) => left.localeCompare(right));

      return {
        path,
        isEntrypoint: entrypointPaths.has(normalize(sourceFile.getFilePath())),
        dependencies: uniqueSorted(dependencies),
        exports: uniqueSorted(exports),
      } satisfies AnalysisModule;
    })
    .sort((left, right) => left.path.localeCompare(right.path));
}

/***
 * Returns unique string values sorted for deterministic generated output.
 */
function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

/***
 * Normalizes platform-specific path separators for generated documentation output.
 */
function toPosixPath(path: string): string {
  return path.replaceAll('\\', '/');
}
