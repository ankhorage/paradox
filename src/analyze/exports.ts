import { isAbsolute, join, normalize } from 'node:path';

import type { Node, Project } from 'ts-morph';

import type { AnalysisExport } from './types.js';
import { getParadoxComment } from './utils/getParadoxComment.js';
import { parseParadoxComment } from './utils/parseParadoxComment.js';
import { resolveExportSymbol } from './utils/resolveExportSymbol.js';

interface AnalyzeExportsResult {
  exports: AnalysisExport[];
  config: {
    exportName: string;
  } | null;
}

/***
 * Collects exported declarations from configured package entrypoints.
 */
export function analyzeExports(
  project: Project,
  options: {
    root: string;
    entrypoints: readonly string[];
  },
): AnalyzeExportsResult {
  const exports: AnalysisExport[] = [];
  let config: AnalyzeExportsResult['config'] = null;

  for (const sourceFile of getEntryPointSourceFiles(project, options)) {
    const exported = sourceFile.getExportSymbols();

    for (const symbol of exported) {
      const resolved = resolveExportSymbol(symbol);
      const [decl] = resolved.getDeclarations();

      const rawComment = getParadoxComment(decl);
      const parsed = rawComment
        ? parseParadoxComment(rawComment)
        : { description: null, isConfig: false };

      if (parsed.isConfig) {
        config = {
          exportName: resolved.getName(),
        };
      }

      exports.push({
        name: resolved.getName(),
        node: decl,
        description: parsed.description,
        kind: inferKind(decl),
      });
    }
  }

  return {
    exports,
    config,
  };
}

function getEntryPointSourceFiles(
  project: Project,
  options: {
    root: string;
    entrypoints: readonly string[];
  },
) {
  return options.entrypoints
    .map((entrypoint) => {
      const absolutePath = normalize(
        isAbsolute(entrypoint) ? entrypoint : join(options.root, entrypoint),
      );

      return project.getSourceFile(
        (sourceFile) => normalize(sourceFile.getFilePath()) === absolutePath,
      );
    })
    .filter((sourceFile) => sourceFile != null);
}

function inferKind(node: Node): AnalysisExport['kind'] {
  if ('getParameters' in node) return 'function';
  if ('getProperties' in node || 'getMembers' in node) return 'type';
  return 'unknown';
}
