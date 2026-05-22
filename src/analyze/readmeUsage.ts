import { readFile } from 'node:fs/promises';
import { extname, isAbsolute, join, relative } from 'node:path';

import { parseParadoxComment } from './utils/parseParadoxComment.js';

export interface AnalysisReadmeUsage {
  title: string | null;
  description: string | null;
  language: string;
  code: string;
  sourcePath: string;
}

interface UsageCommentMatch {
  comment: string;
  start: number;
  end: number;
}

const USAGE_TAG = `${String.fromCharCode(64)}usage`;

/***
 * Collects README usage examples from configured real source files.
 */
export async function analyzeReadmeUsage(options: {
  root: string;
  entrypoints: readonly string[];
}): Promise<AnalysisReadmeUsage[]> {
  const entries = await Promise.all(
    options.entrypoints.map(async (entrypoint) => analyzeUsageEntrypoint(options.root, entrypoint)),
  );

  return entries.flat().sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
}

async function analyzeUsageEntrypoint(
  root: string,
  entrypoint: string,
): Promise<AnalysisReadmeUsage[]> {
  const absolutePath = isAbsolute(entrypoint) ? entrypoint : join(root, entrypoint);
  const source = await readFile(absolutePath, 'utf-8');
  const sourcePath = toPosixPath(relative(root, absolutePath));
  const matches = findUsageComments(source);

  return matches.map((match) => {
    const parsed = parseParadoxComment(match.comment);

    return {
      title: getUsageTitle(parsed.description, sourcePath),
      description: parsed.description,
      language: getLanguage(sourcePath),
      code: removeRange(source, match.start, match.end).trim(),
      sourcePath,
    };
  });
}

function findUsageComments(source: string): UsageCommentMatch[] {
  const matches: UsageCommentMatch[] = [];
  const pattern = /\/\*\*\*[\s\S]*?\*\//g;

  for (const match of source.matchAll(pattern)) {
    const [comment] = match;
    if (!comment.includes(USAGE_TAG)) continue;

    matches.push({
      comment,
      start: match.index,
      end: match.index + comment.length,
    });
  }

  return matches;
}

function removeRange(source: string, start: number, end: number): string {
  return `${source.slice(0, start)}${source.slice(end)}`;
}

function getUsageTitle(description: string | null, sourcePath: string): string | null {
  if (description === null) return sourcePath;
  const [firstLine = sourcePath] = description.split('\n');
  return firstLine.trim() || sourcePath;
}

function getLanguage(sourcePath: string): string {
  const extension = extname(sourcePath).toLowerCase();

  if (extension === '.tsx') return 'tsx';
  if (extension === '.ts') return 'ts';
  if (extension === '.jsx') return 'jsx';
  if (extension === '.js') return 'js';

  return '';
}

function toPosixPath(path: string): string {
  return path.replaceAll('\\', '/');
}
