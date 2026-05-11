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
    const id = `${sourcePath}:${line}:${column}`;

    blocks.push({
      id,
      sourcePath,
      start,
      end,
      line,
      column,
      raw,
      description: parsed.description,
      params: parsed.params,
      returns: parsed.returns,
      tags: parsed.tags,
    });
  }

  return blocks;
}

/***
 * Extracts registered tags from a doc block.
 */
export function collectTags(
  raw: string,
  tagRegistry: TagRegistry = defaultTagRegistry,
): AnalyzedTag[] {
  const tags: AnalyzedTag[] = [];
  const lines = normalizeDocBlock(raw);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('@')) continue;

    const [tagName, ...rest] = trimmed.slice(1).split(/\s+/);
    if (!tagName || !tagRegistry.has(tagName)) continue;

    const value = rest.join(' ').trim();
    tags.push({
      name: tagName,
      value: value.length > 0 ? value : null,
    });
  }

  return tags;
}

interface ParsedDocBlock {
  description: string | null;
  tags: AnalyzedTag[];
  params: Record<string, string>;
  returns: string | null;
}

function parseDocBlock(raw: string, tagRegistry: TagRegistry): ParsedDocBlock {
  const lines = normalizeDocBlock(raw);
  const tags = collectTags(raw, tagRegistry);
  const params: Record<string, string> = {};
  let returns: string | null = null;

  const description = lines
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith('@')) return true;

      const [tagName, ...rest] = trimmed.slice(1).split(/\s+/);
      if (!tagName) return false;

      if (tagName === 'param') {
        const [name, ...descParts] = rest;
        if (name) {
          params[name] = descParts.join(' ').trim();
        }
        return false;
      }

      if (tagName === 'returns' || tagName === 'return') {
        const returnBody = rest.join(' ').trim();
        returns = returnBody.length > 0 ? returnBody : null;
        return false;
      }

      if (tagRegistry.has(tagName)) {
        return false;
      }

      return true;
    })
    .join('\n')
    .trim();

  return {
    description: description.length > 0 ? description : null,
    tags,
    params,
    returns,
  };
}

function normalizeDocBlock(raw: string): string[] {
  return raw
    .replace(/^\/\*\*\*/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trimEnd());
}
