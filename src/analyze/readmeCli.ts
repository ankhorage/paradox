import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { getLeadingParadoxComment } from './utils/getLeadingParadoxComment.js';

const CLI_INDEX_PATH = 'src/cli/index.ts';

export interface AnalysisReadmeCli {
  description: string | null;
  sourcePath: string;
}

/***
 * Collects README CLI metadata from the canonical Ankhorage CLI entrypoint when its leading
 * Paradox comment opts into README output with @readme.
 */
export async function analyzeReadmeCli(root: string): Promise<AnalysisReadmeCli | null> {
  const filePath = join(root, CLI_INDEX_PATH);
  let source: string;

  try {
    source = await readFile(filePath, 'utf-8');
  } catch (error) {
    if (isMissingPathError(error)) return null;
    throw error;
  }

  const comment = getLeadingParadoxComment(source);
  if (comment === null || !comment.parsed.isReadme) return null;

  return {
    description: comment.parsed.description,
    sourcePath: CLI_INDEX_PATH,
  };
}

function isMissingPathError(error: unknown): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof error.code === 'string' &&
    error.code === 'ENOENT'
  );
}
