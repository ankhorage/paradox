import type { AnalyzedDocBlock, AnalyzedExport, AnalyzedProgram } from './model.js';
import { relativeToRoot } from './utils.js';

/***
 * Attaches doc blocks and tags to their nearest symbol declarations.
 */
export function associateDocBlocksWithSymbols(
  program: AnalyzedProgram,
  docBlocks: readonly AnalyzedDocBlock[],
  exports: readonly AnalyzedExport[],
): AnalyzedExport[] {
  const docBlocksByFile = new Map<string, AnalyzedDocBlock[]>();

  for (const docBlock of docBlocks) {
    const entries = docBlocksByFile.get(docBlock.sourcePath);
    if (entries) {
      entries.push(docBlock);
    } else {
      docBlocksByFile.set(docBlock.sourcePath, [docBlock]);
    }
  }

  for (const [, entries] of docBlocksByFile) {
    entries.sort((left, right) => left.start - right.start);
  }

  return exports.map((entry) => {
    const sourceFile = entry.node.getSourceFile();
    const sourcePath = relativeToRoot(program.root, sourceFile.getFilePath());
    const docBlocksForFile = docBlocksByFile.get(sourcePath) ?? [];
    const nodeStart = entry.node.getStart(false);
    let match: AnalyzedDocBlock | undefined = undefined;

    for (const block of docBlocksForFile) {
      if (block.end > nodeStart) break;
      if (block.end > 0) {
        match = block;
      }
    }

    if (match) {
      const text = sourceFile.getFullText();
      const between = text.slice(match.end, nodeStart);
      if (!/^[\s;]*(export\s+)?(default\s+)?$/.test(between)) {
        match = undefined;
      }
    }
    if (!match) {
      return {
        ...entry,
        tags: entry.tags,
      };
    }

    return {
      ...entry,
      docBlock: match,
      tags: match.tags,
    };
  });
}
