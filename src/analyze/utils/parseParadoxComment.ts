import { isParadoxDocTagName, type ParadoxDocTagName } from '../../doc-tags/registry.js';

interface ParsedParadoxTag {
  readonly name: ParadoxDocTagName;
  readonly value: string | null;
}

/***
 * Parsed representation of a Paradox documentation comment.
 */
export interface ParsedParadoxComment {
  description: string | null;
  isConfig: boolean;
  isReadme: boolean;
  isUsage: boolean;
  title: string | null;
  see: string[];
  security: string[];
  tags: ParsedParadoxTag[];
  unsupportedTags: string[];
  hasCodeBlock: boolean;
}

/***
 * Parses a Paradox comment into prose, supported tags, and validation evidence.
 */
export function parseParadoxComment(rawComment: string): ParsedParadoxComment {
  const lines = normalizeCommentLines(rawComment);
  const parsedLines = lines.map(parseCommentLine);
  const tags = parsedLines.flatMap((line) => line.tag ?? []);
  const unsupportedTags = parsedLines.flatMap((line) => line.unsupportedTag ?? []);
  const description = parsedLines
    .filter((line) => line.tag === undefined && line.unsupportedTag === undefined)
    .map((line) => line.text)
    .join('\n')
    .trim();

  return {
    description: description.length > 0 ? description : null,
    isConfig: hasTag(tags, 'config'),
    isReadme: hasTag(tags, 'readme'),
    isUsage: hasTag(tags, 'usage'),
    title: getSingleTagValue(tags, 'title'),
    see: getTagValues(tags, 'see'),
    security: getTagValues(tags, 'security'),
    tags,
    unsupportedTags,
    hasCodeBlock: hasCodeBlock(lines),
  };
}

interface ParsedCommentLine {
  readonly text: string;
  readonly tag?: ParsedParadoxTag;
  readonly unsupportedTag?: string;
}

/***
 * Parses one normalized comment line when it has explicit tag-line syntax.
 */
function parseCommentLine(text: string): ParsedCommentLine {
  const trimmed = text.trim();
  const match = /^@([A-Za-z][A-Za-z0-9-]*)(?:\s+(.*))?$/.exec(trimmed);
  if (match === null) return { text };

  const [, name] = match;
  const value = match.slice(2).join('').trim();
  if (!isParadoxDocTagName(name)) {
    return { text, unsupportedTag: name };
  }

  return {
    text,
    tag: {
      name,
      value: value.length > 0 ? value : null,
    },
  };
}

/***
 * Returns whether a parsed tag set contains the requested tag.
 */
function hasTag(tags: readonly ParsedParadoxTag[], name: ParadoxDocTagName): boolean {
  return tags.some((tag) => tag.name === name);
}

/***
 * Returns all non-empty values for a repeatable tag.
 */
function getTagValues(tags: readonly ParsedParadoxTag[], name: ParadoxDocTagName): string[] {
  return tags.flatMap((tag) => (tag.name === name && tag.value !== null ? [tag.value] : []));
}

/***
 * Returns the first non-empty value for a singular tag.
 */
function getSingleTagValue(
  tags: readonly ParsedParadoxTag[],
  name: ParadoxDocTagName,
): string | null {
  return getTagValues(tags, name)[0] ?? null;
}

/***
 * Detects fenced or Markdown-indented code blocks while leaving inline code spans untouched.
 */
function hasCodeBlock(lines: readonly string[]): boolean {
  return lines.some((line) => {
    const trimmed = line.trimStart();
    return trimmed.startsWith('```') || trimmed.startsWith('~~~') || /^(?: {4}|\t)\S/.test(line);
  });
}

/***
 * Removes Paradox comment syntax while preserving prose indentation for code-block validation.
 */
function normalizeCommentLines(rawComment: string): string[] {
  return rawComment
    .replace(/^\/\*\*\*/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\* ?/, '').replace(/\s+$/, ''));
}
