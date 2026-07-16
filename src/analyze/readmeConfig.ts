import { readFile } from 'node:fs/promises';
import { extname, relative } from 'node:path';

import { parseParadoxComment } from './utils/parseParadoxComment.js';

export interface AnalysisReadmeConfig {
  description: string | null;
  language: string;
  code: string;
  sourcePath: string;
}

interface ConfigCommentMatch {
  comment: string;
  start: number;
  end: number;
}

/***
 * Collects a README configuration example from the actual Paradox config file when its
 * leading Paradox comment is marked with both @config and @readme.
 */
export async function analyzeReadmeConfig(options: {
  root: string;
  configFilePath: string | null;
}): Promise<AnalysisReadmeConfig | null> {
  if (options.configFilePath === null) return null;

  const source = await readFile(options.configFilePath, 'utf-8');
  const match = findLeadingParadoxComment(source);
  if (match === null) return null;

  const parsed = parseParadoxComment(match.comment);
  if (!parsed.isConfig || !parsed.isReadme) return null;

  const sourcePath = toPosixPath(relative(options.root, options.configFilePath));

  return {
    description: parsed.description,
    language: getLanguage(sourcePath),
    code: removeRange(source, match.start, match.end).trim(),
    sourcePath,
  };
}

function findLeadingParadoxComment(source: string): ConfigCommentMatch | null {
  const match = /^\s*(\/\*\*\*[\s\S]*?\*\/)/.exec(source);
  const comment = match?.[1];
  if (match === null || comment === undefined) return null;

  const start = match[0].indexOf(comment);

  return {
    comment,
    start,
    end: start + comment.length,
  };
}

function removeRange(source: string, start: number, end: number): string {
  const before = source.slice(0, start).trimEnd();
  const after = source.slice(end).trimStart();

  if (before.length === 0) return after;
  if (after.length === 0) return before;

  return `${before}\n\n${after}`;
}

function getLanguage(sourcePath: string): string {
  const extension = extname(sourcePath).toLowerCase();

  if (extension === '.ts') return 'ts';
  if (extension === '.js' || extension === '.mjs' || extension === '.cjs') return 'js';

  return '';
}

function toPosixPath(path: string): string {
  return path.replaceAll('\\', '/');
}
