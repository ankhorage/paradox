import type { SourceFile } from 'ts-morph';

import type { AnalyzedDocBlock, AnalyzedProgram, AnalyzedTag } from './model.js';
import type { TagRegistry } from './tagRegistry.js';
import { defaultTagRegistry } from './tagRegistry.js';
import { relativeToRoot } from './utils.js';

const DOC_BLOCK_REGEX = /\/\*\*\*[\s\S]*?\*\//g;

/***
 * Collects all Paradox doc blocks from a source file.
 */
export function collectDocBlocks(
  sourceFile: SourceFile,
  options: { program: AnalyzedProgram; tagRegistry?: TagRegistry },
): AnalyzedDocBlock[] {
  const { program } = options;
  const tagRegistry = options.tagRegistry ?? defaultTagRegistry;
  const text = sourceFile.getFullText();
  const sourcePath = relativeToRoot(program.root, sourceFile.getFilePath());
  const blocks: AnalyzedDocBlock[] = [];

  for (const match of text.matchAll(DOC_BLOCK_REGEX)) {
    const [raw = ''] = match;
    const start = match.index;
    const end = start + raw.length;
    const { line, column } = sourceFile.getLineAndColumnAtPos(start);
    const parsed = parseDocBlock(raw, tagRegistry);

    blocks.push({
      id: `${sourcePath}:${line}:${column}`,
      sourcePath,
      start,
      end,
      line,
      column,
      raw,
      description: parsed.description,
      tags: parsed.tags,
    });
  }

  return blocks;
}

/***
 * Extracts registered tags from a doc block.
 */
function collectTags(raw: string, tagRegistry: TagRegistry = defaultTagRegistry): AnalyzedTag[] {
  return normalizeDocBlock(raw).flatMap((line): AnalyzedTag[] => {
    const match = /^@([A-Za-z][A-Za-z0-9-]*)(?:\s+(.*))?$/.exec(line.trim());
    if (match === null) return [];

    const [, name = '', rawValue] = match;
    if (!tagRegistry.has(name)) return [];

    const value = rawValue?.trim() ?? '';
    return [{ name, value: value.length > 0 ? value : null }];
  });
}

interface ParsedDocBlock {
  description: string | null;
  tags: AnalyzedTag[];
}

/***
 * Parses semantic description and supported tags without interpreting unsupported tag syntax.
 */
function parseDocBlock(raw: string, tagRegistry: TagRegistry): ParsedDocBlock {
  const lines = normalizeDocBlock(raw);
  const tags = collectTags(raw, tagRegistry);
  const description = lines
    .filter((line) => !/^@[A-Za-z][A-Za-z0-9-]*(?:\s|$)/.test(line.trim()))
    .join('\n')
    .trim();

  return {
    description: description.length > 0 ? description : null,
    tags,
  };
}

/***
 * Removes Paradox comment delimiters while preserving prose content.
 */
function normalizeDocBlock(raw: string): string[] {
  return raw
    .replace(/^\/\*\*\*/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trimEnd());
}
