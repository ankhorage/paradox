import { readFile } from 'node:fs/promises';
import { extname, relative } from 'node:path';

import { getLeadingParadoxComment } from './utils/getLeadingParadoxComment.js';

export interface AnalysisReadmeConfig {
  description: string | null;
  language: string;
  code: string;
  sourcePath: string;
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
  const comment = getLeadingParadoxComment(source);
  if (comment === null) return null;

  if (!comment.parsed.isConfig || !comment.parsed.isReadme) return null;

  const sourcePath = toPosixPath(relative(options.root, options.configFilePath));

  return {
    description: comment.parsed.description,
    language: getLanguage(sourcePath),
    code: removeRange(source, comment.start, comment.end).trim(),
    sourcePath,
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
