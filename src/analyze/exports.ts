import { isAbsolute, join, normalize, relative } from 'node:path';

import { uniqueSortedStrings } from '@ankhorage/utility/array';
import { Node, type Project } from 'ts-morph';

import type { AnalysisExport } from './types.js';
import { getExportMetadata } from './utils/getExportMetadata.js';
import { getParadoxComment } from './utils/getParadoxComment.js';
import { parseParadoxComment } from './utils/parseParadoxComment.js';
import { resolveExportSymbol } from './utils/resolveExportSymbol.js';

interface AnalyzeExportsResult {
  exports: AnalysisExport[];
  config: {
    exportName: string;
    isReadme: boolean;
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
      const parsed = rawComment ? parseParadoxComment(rawComment) : createEmptyMetadata();
      const name = resolved.getName();

      if (parsed.isConfig) {
        config = {
          exportName: name,
          isReadme: parsed.isReadme,
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
              isReadme: existing.isReadme || parsed.isReadme,
              examples: existing.examples.length > 0 ? existing.examples : parsed.examples,
              exportPaths: uniqueSortedStrings([...existing.exportPaths, ...metadata.exportPaths]),
              relatedSymbols: uniqueSortedStrings([
                ...existing.relatedSymbols,
                ...metadata.relatedSymbols,
              ]),
              signatures:
                existing.signatures.length > 0 ? existing.signatures : metadata.signatures,
              members: existing.members.length > 0 ? existing.members : metadata.members,
              structuredRows:
                existing.structuredRows.length > 0
                  ? existing.structuredRows
                  : metadata.structuredRows,
            }
          : {
              name,
              node: decl,
              description: parsed.description,
              isReadme: parsed.isReadme,
              examples: parsed.examples,
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

/***
 * Resolves configured entrypoint paths to source files in the TypeScript project.
 */
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

/***
 * Returns the first declaration for a symbol, or null when none exists.
 */
function getFirstDeclaration(declarations: readonly Node[]): Node | null {
  const [declaration = null] = declarations;
  return declaration;
}

/***
 * Infers the public export kind from the declaration shape.
 */
function inferKind(node: Node): AnalysisExport['kind'] {
  if ('getParameters' in node) return 'function';
  if ('getProperties' in node || 'getMembers' in node) return 'type';
  if (Node.isVariableDeclaration(node)) return 'value';
  return 'unknown';
}


/***
 * Normalizes platform-specific path separators for generated documentation output.
 */
function toPosixPath(path: string): string {
  return path.replaceAll('\\', '/');
}

/***
 * Creates empty documentation metadata for exports without Paradox comments.
 */
function createEmptyMetadata() {
  return {
    description: null,
    isConfig: false,
    isReadme: false,
    examples: [],
    params: {},
    returns: null,
  };
}
