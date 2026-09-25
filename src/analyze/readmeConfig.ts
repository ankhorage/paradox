import { readFile } from 'node:fs/promises';
import { extname, relative } from 'node:path';

export interface AnalysisReadmeConfig {
  language: string;
  code: string;
  sourcePath: string;
}

/***
 * Collects the concrete Paradox configuration instance as a README configuration example.
 */
export async function analyzeReadmeConfig(options: {
  root: string;
  configFilePath: string | null;
}): Promise<AnalysisReadmeConfig | null> {
  if (options.configFilePath === null) return null;

  const source = await readFile(options.configFilePath, 'utf-8');
  const sourcePath = toPosixPath(relative(options.root, options.configFilePath));

  return {
    language: getLanguage(sourcePath),
    code: source.trim(),
    sourcePath,
  };
}

/***
 * Returns the Markdown fence language for a configuration source path.
 */
function getLanguage(sourcePath: string): string {
  const extension = extname(sourcePath).toLowerCase();
  if (extension === '.ts') return 'ts';
  if (extension === '.js' || extension === '.mjs' || extension === '.cjs') return 'js';
  return '';
}

/***
 * Normalizes filesystem separators for stable documentation paths.
 */
function toPosixPath(path: string): string {
  return path.replaceAll('\\', '/');
}
