import { relative } from 'node:path';

import { Node, type Project } from 'ts-morph';

import type { AnalysisSourceFunction } from './types.js';
import { getParadoxComment } from './utils/getParadoxComment.js';
import { parseParadoxComment } from './utils/parseParadoxComment.js';

/***
 * Collects callable declarations from analyzed source files for source-area documentation.
 */
export function analyzeSourceFunctions(project: Project, root: string): AnalysisSourceFunction[] {
  return project
    .getSourceFiles()
    .flatMap((sourceFile) => {
      if (sourceFile.isDeclarationFile()) return [];

      const filePath = toPosixPath(relative(root, sourceFile.getFilePath()));
      if (!filePath.startsWith('src/')) return [];

      return sourceFile
        .getDescendants()
        .flatMap((node): AnalysisSourceFunction[] => {
          if (Node.isFunctionDeclaration(node)) {
            const name = node.getName();
            if (name === undefined) return [];
            return [createSourceFunction(name, node, root)];
          }

          if (Node.isVariableDeclaration(node)) {
            const initializer = node.getInitializer();
            if (
              initializer === undefined ||
              (!Node.isArrowFunction(initializer) && !Node.isFunctionExpression(initializer))
            ) {
              return [];
            }

            return [createSourceFunction(node.getName(), node, root)];
          }

          return [];
        });
    })
    .sort((left, right) =>
      left.sourceLocation.filePath === right.sourceLocation.filePath
        ? left.sourceLocation.line - right.sourceLocation.line
        : left.sourceLocation.filePath.localeCompare(right.sourceLocation.filePath),
    );
}

/***
 * Converts a callable declaration into source documentation metadata.
 */
function createSourceFunction(
  name: string,
  node: Node,
  root: string,
): AnalysisSourceFunction {
  const sourceFile = node.getSourceFile();
  const { column, line } = sourceFile.getLineAndColumnAtPos(node.getStart(false));
  const rawComment = getParadoxComment(node);
  const parsedComment = rawComment
    ? parseParadoxComment(rawComment)
    : { description: null, isReadme: false };

  return {
    name,
    description: parsedComment.description,
    sourceLocation: {
      filePath: toPosixPath(relative(root, sourceFile.getFilePath())),
      line,
      column,
    },
  };
}

/***
 * Normalizes platform-specific path separators for generated documentation output.
 */
function toPosixPath(path: string): string {
  return path.replaceAll('\\', '/');
}
