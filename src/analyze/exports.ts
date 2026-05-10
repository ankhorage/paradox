import { isAbsolute, join, normalize, relative } from 'node:path';

import type { Node, Project } from 'ts-morph';

import type { AnalysisExport } from './types.js';
import { getExportMetadata } from './utils/getExportMetadata.js';
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
  const exportsByName = new Map<string, AnalysisExport>();
  let config: AnalyzeExportsResult['config'] = null;

  for (const sourceFile of getEntryPointSourceFiles(project, options)) {
    const entrypointPath = toPosixPath(relative(options.root, sourceFile.getFilePath()));
    const exported = sourceFile.getExportSymbols();

    for (const symbol of exported) {
      const resolved = resolveExportSymbol(symbol);
      const decl = getFirstDeclaration(resolved.getDeclarations());

      if (decl === null) {
        continue;
      }

      const rawComment = getParadoxComment(decl);
      const parsed = rawComment
        ? parseParadoxComment(rawComment)
        : { description: null, isConfig: false, params: {}, returns: null };
      const name = resolved.getName();

      if (parsed.isConfig) {
        config = {
          exportName: name,
        };
      }

      const metadata = getExportMetadata({
        name,
        node: decl,
        root: options.root,
        entrypointPath,
        symbol: resolved,
      });
      const existing = exportsByName.get(name);

      exportsByName.set(
        name,
        existing
          ? {
              ...existing,
              description: existing.description ?? parsed.description,
              exportPaths: uniqueSorted([...existing.exportPaths, ...metadata.exportPaths]),
              relatedSymbols: uniqueSorted([
                ...existing.relatedSymbols,
                ...metadata.relatedSymbols,
              ]),
              signatures:
                existing.signatures.length > 0 ? existing.signatures : metadata.signatures,
              members: existing.members.length > 0 ? existing.members : metadata.members,
            }
          : {
              name,
              node: decl,
              description: parsed.description,
              kind: inferKind(decl),
              ...metadata,
            },
      );
    }
  }

  return {
    exports: [...exportsByName.values()],
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

function getFirstDeclaration(declarations: readonly Node[]): Node | null {
  const [declaration = null] = declarations;
  return declaration;
}

function inferKind(node: Node): AnalysisExport['kind'] {
  if ('getParameters' in node) return 'function';
  if ('getProperties' in node || 'getMembers' in node) return 'type';
  return 'unknown';
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function toPosixPath(path: string): string {
  return path.replaceAll('\\', '/');
}
