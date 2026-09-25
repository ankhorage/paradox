import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

import { toPortablePath } from '@ankhorage/utility/node/path';
import type { ParsedParadoxComment } from '../utils/parseParadoxComment.js';
import { parseParadoxComment } from '../utils/parseParadoxComment.js';

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json5']);
const SCANNED_ROOTS = ['src', 'examples'] as const;
const COMMENT_PATTERN = /\/\*\*\*[\s\S]*?\*\//g;

export interface CollectedDocumentationComment {
  readonly sourcePath: string;
  readonly line: number;
  readonly raw: string;
  readonly parsed: ParsedParadoxComment;
}

/***
 * Collects real Paradox comments from canonical source roots and source-like repository root files.
 */
export async function collectDocumentationCommentsAsync(
  root: string,
): Promise<CollectedDocumentationComment[]> {
  const nestedFiles = (
    await Promise.all(SCANNED_ROOTS.map((name) => collectSourceFilesAsync(join(root, name))))
  ).flat();
  const rootFiles = await collectRootSourceFilesAsync(root);
  const files = [...new Set([...nestedFiles, ...rootFiles])].sort((a, b) => a.localeCompare(b));
  const comments = await Promise.all(
    files.map((filePath) => collectFileCommentsAsync(root, filePath)),
  );
  return comments.flat();
}

/***
 * Collects supported source files recursively while treating missing canonical roots as empty.
 */
async function collectSourceFilesAsync(root: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if (isMissingPathError(error)) return [];
    throw error;
  }

  const nested = await Promise.all(
    entries.map(async (entry): Promise<string[]> => {
      const path = join(root, entry.name);
      if (entry.isDirectory()) return collectSourceFilesAsync(path);
      return entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name)) ? [path] : [];
    }),
  );
  return nested.flat();
}

/***
 * Collects source-like files directly at repository root.
 */
async function collectRootSourceFilesAsync(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  return entries.flatMap((entry) =>
    entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name)) ? [join(root, entry.name)] : [],
  );
}

/***
 * Collects Paradox comments from one source file with stable line locations.
 */
async function collectFileCommentsAsync(
  root: string,
  filePath: string,
): Promise<CollectedDocumentationComment[]> {
  const source = await readFile(filePath, 'utf-8');
  const sourcePath = toPortablePath(relative(root, filePath));

  return [...source.matchAll(COMMENT_PATTERN)].map((match) => {
    const [raw] = match;
    return {
      sourcePath,
      line: source.slice(0, match.index).split('\n').length,
      raw,
      parsed: parseParadoxComment(raw),
    };
  });
}

/***
 * Checks whether a filesystem error reports a missing path.
 */
function isMissingPathError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

