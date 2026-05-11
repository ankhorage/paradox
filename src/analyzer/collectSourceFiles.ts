import { normalize } from 'node:path';

import type { AnalyzedFile, AnalyzedProgram } from './model.js';
import { isNodeModulePath, isPathInsideRoot, relativeToRoot } from './utils.js';

/***
 * Collects stable source file metadata for the analyzer.
 */
export function collectSourceFiles(program: AnalyzedProgram): AnalyzedFile[] {
  const entrypoints = new Set(
    program.entrypointFilePaths.map((entrypoint) => normalize(entrypoint)),
  );

  return program.project
    .getSourceFiles()
    .filter((sourceFile) => {
      const filePath = sourceFile.getFilePath();
      return (
        !sourceFile.isDeclarationFile() &&
        isPathInsideRoot(program.root, filePath) &&
        !isNodeModulePath(filePath)
      );
    })
    .map((sourceFile) => ({
      path: relativeToRoot(program.root, sourceFile.getFilePath()),
      sourceFile,
      isEntrypoint: entrypoints.has(normalize(sourceFile.getFilePath())),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
}
