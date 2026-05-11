import { isAbsolute, join, normalize } from 'node:path';

import { Project } from 'ts-morph';

import type { AnalyzedProgram } from './model.js';
import { toPosixPath } from './utils.js';

interface CreateProgramOptions {
  root: string;
  entrypoints?: string[];
  project?: Project;
  tsconfigPath?: string;
}

/***
 * Creates or reuses a ts-morph project for analysis.
 */
export function createTypeScriptProgram(options: CreateProgramOptions): AnalyzedProgram {
  const root = normalize(options.root);
  const entrypoints = options.entrypoints ?? ['src/index.ts'];
  const entrypointFilePaths = entrypoints.map((entrypoint) =>
    normalize(isAbsolute(entrypoint) ? entrypoint : join(root, entrypoint)),
  );
  const project =
    options.project ??
    new Project({
      tsConfigFilePath: options.tsconfigPath ?? join(root, 'tsconfig.json'),
      skipAddingFilesFromTsConfig: false,
    });

  return {
    project,
    typeChecker: project.getTypeChecker(),
    root,
    entrypoints: entrypoints.map((entrypoint) => toPosixPath(entrypoint)),
    entrypointFilePaths,
  };
}
