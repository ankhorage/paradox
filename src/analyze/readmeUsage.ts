import { readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

import { DOCUMENTATION_POLICY } from '@ankhorage/policy/documentation';
import { toPortablePath } from '@ankhorage/utility/node/path';
import { Project, type Statement } from 'ts-morph';

import type { AnalysisUsageEntry } from './types.js';
import { getParadoxComment } from './utils/getParadoxComment.js';
import { parseParadoxComment } from './utils/parseParadoxComment.js';

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

/***
 * Collects every canonical usage declaration from examples and CLI source roots.
 */
export async function analyzeReadmeUsage(options: { root: string }): Promise<AnalysisUsageEntry[]> {
  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const files = (
    await Promise.all(
      DOCUMENTATION_POLICY.paths.usageRoots.map((usageRoot) =>
        collectSourceFilesAsync(join(options.root, usageRoot)),
      ),
    )
  )
    .flat()
    .sort((left, right) => left.localeCompare(right));

  return files.flatMap((filePath) => analyzeUsageFile(options.root, project, filePath));
}

/***
 * Collects supported source files recursively below one canonical usage root.
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
 * Extracts usage-marked top-level statements from one real source file.
 */
function analyzeUsageFile(root: string, project: Project, filePath: string): AnalysisUsageEntry[] {
  const sourceFile = project.getSourceFile(filePath) ?? project.addSourceFileAtPath(filePath);
  const sourcePath = toPortablePath(relative(root, filePath));

  return sourceFile.getStatements().flatMap((statement): AnalysisUsageEntry[] => {
    const comment = getParadoxComment(statement);
    if (comment === null) return [];

    const parsed = parseParadoxComment(comment);
    if (!parsed.isUsage) return [];

    return [
      {
        area: sourcePath.startsWith(`${DOCUMENTATION_POLICY.paths.examplesRoot}/`)
          ? 'examples'
          : 'cli',
        title: parsed.title ?? deriveUsageTitle(sourcePath),
        description: parsed.description,
        language: getLanguage(sourcePath),
        code: getStatementCode(statement),
        sourcePath,
        isReadme: parsed.isReadme,
        see: parsed.see,
        security: parsed.security,
      },
    ];
  });
}

/***
 * Returns the exact source statement owned by a usage comment.
 */
function getStatementCode(statement: Statement): string {
  return statement.getText().trim();
}

/***
 * Derives a deterministic title from the canonical example or CLI structure.
 */
function deriveUsageTitle(sourcePath: string): string {
  const parts = sourcePath.split('/');
  if (parts[0] === DOCUMENTATION_POLICY.paths.examplesRoot) {
    return titleCase(parts[1] ?? 'usage');
  }

  if (sourcePath === `${DOCUMENTATION_POLICY.paths.cliRoot}/index.ts`) {
    return 'CLI';
  }

  const commandsIndex = parts.indexOf('commands');
  const commandParts =
    commandsIndex === -1 ? [parts.at(-1) ?? 'cli'] : parts.slice(commandsIndex + 1);
  return commandParts
    .map((part) => part.replace(/\.[^.]+$/, ''))
    .map(titleCase)
    .join(' ');
}

/***
 * Converts a kebab-case structural segment into presentation words.
 */
function titleCase(value: string): string {
  return value
    .split('-')
    .filter((word) => word.length > 0)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

/***
 * Returns the Markdown fence language for a usage source path.
 */
function getLanguage(sourcePath: string): string {
  const extension = extname(sourcePath).toLowerCase();
  if (extension === '.tsx') return 'tsx';
  if (extension === '.ts') return 'ts';
  if (extension === '.jsx') return 'jsx';
  if (extension === '.js' || extension === '.mjs' || extension === '.cjs') return 'js';
  return '';
}

/***
 * Counts real example directories directly below the canonical examples root.
 */
export async function countExampleDirectoriesAsync(root: string): Promise<number> {
  try {
    const entries = await readdir(join(root, DOCUMENTATION_POLICY.paths.examplesRoot), {
      withFileTypes: true,
    });
    return entries.filter((entry) => entry.isDirectory()).length;
  } catch (error) {
    if (isMissingPathError(error)) return 0;
    throw error;
  }
}

/***
 * Checks whether a filesystem error reports a missing path.
 */
function isMissingPathError(error: unknown): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof error.code === 'string' &&
    error.code === 'ENOENT'
  );
}
