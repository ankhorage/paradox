import { access, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { AnalysisBadge } from './types.js';
import type { PackageJsonModel } from './usage.js';

const ESLINT_CONFIG_FILES = [
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.cjs',
  'eslint.config.ts',
  '.eslintrc',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.json',
  '.eslintrc.yaml',
  '.eslintrc.yml',
] as const;

const PRETTIER_CONFIG_FILES = [
  '.prettierrc',
  '.prettierrc.js',
  '.prettierrc.cjs',
  '.prettierrc.json',
  '.prettierrc.yaml',
  '.prettierrc.yml',
  'prettier.config.js',
  'prettier.config.cjs',
  'prettier.config.mjs',
  'prettier.config.ts',
] as const;

const BADGE_ORDER = [
  'license',
  'npm',
  'runtime',
  'typescript',
  'eslint',
  'prettier',
  'build',
  'tests',
  'coverage',
  'docs',
] as const;

interface TsConfigModel {
  compilerOptions?: {
    strict?: unknown;
  };
}

interface CoverageSummaryModel {
  total?: {
    lines?: {
      pct?: unknown;
    };
  };
}

/***
 * Derives deterministic repository metadata badges from local repository files.
 */
export async function analyzeBadges(root: string, pkg: PackageJsonModel): Promise<AnalysisBadge[]> {
  const workflowFiles = await readWorkflowFiles(root);
  const badges: AnalysisBadge[] = [];

  if (
    (await hasAnyFile(root, ESLINT_CONFIG_FILES)) ||
    pkg.eslintConfig !== undefined ||
    scriptContains(pkg, 'lint', 'eslint')
  ) {
    badges.push({
      id: 'eslint',
      label: 'eslint',
      value: workflowRunsScript(workflowFiles, 'lint') ? 'checked' : 'configured',
      color: workflowRunsScript(workflowFiles, 'lint') ? '0a7f3f' : '2563eb',
    });
  }

  if (
    (await hasAnyFile(root, PRETTIER_CONFIG_FILES)) ||
    pkg.prettier !== undefined ||
    scriptContains(pkg, 'format', 'prettier') ||
    scriptContains(pkg, 'format:check', 'prettier')
  ) {
    const prettierChecked =
      workflowRunsScript(workflowFiles, 'format') ||
      workflowRunsScript(workflowFiles, 'format:check');
    badges.push({
      id: 'prettier',
      label: 'prettier',
      value: prettierChecked ? 'checked' : 'configured',
      color: prettierChecked ? '0a7f3f' : '2563eb',
    });
  }

  if (hasScript(pkg, 'build')) {
    const buildChecked = workflowRunsScript(workflowFiles, 'build');
    badges.push({
      id: 'build',
      label: 'build',
      value: buildChecked ? 'checked' : 'configured',
      color: buildChecked ? '0a7f3f' : '6f42c1',
    });
  }

  if (hasScript(pkg, 'test')) {
    const testsChecked = workflowRunsScript(workflowFiles, 'test');
    badges.push({
      id: 'tests',
      label: 'tests',
      value: testsChecked ? 'checked' : 'configured',
      color: testsChecked ? '0a7f3f' : '6f42c1',
    });
  }

  if (await hasTypeScriptStrictMode(root)) {
    badges.push({
      id: 'typescript',
      label: 'typescript',
      value: 'strict',
      color: '2563eb',
    });
  }

  if (supportsBun(pkg, workflowFiles)) {
    badges.push({
      id: 'runtime',
      label: 'runtime',
      value: 'bun',
      color: 'f59e0b',
    });
  }

  const coverage = await readCoveragePercent(root);
  if (coverage !== null) {
    badges.push({
      id: 'coverage',
      label: 'coverage',
      value: `${formatPercent(coverage)}%`,
      color: getCoverageColor(coverage),
    });
  }

  if (typeof pkg.license === 'string' && pkg.license.length > 0) {
    badges.push({
      id: 'license',
      label: 'license',
      value: pkg.license,
      color: '2563eb',
    });
  }

  if (typeof pkg.version === 'string' && pkg.version.length > 0) {
    badges.push({
      id: 'npm',
      label: 'npm',
      value: `v${pkg.version}`,
      color: 'cb3837',
    });
  }

  badges.push({
    id: 'docs',
    label: 'docs',
    value: 'paradox',
    color: '0f766e',
  });

  return sortBadges(badges);
}

/***
 * Checks whether any candidate file exists under the repository root.
 */
async function hasAnyFile(root: string, paths: readonly string[]): Promise<boolean> {
  for (const relativePath of paths) {
    if (await fileExists(join(root, relativePath))) {
      return true;
    }
  }

  return false;
}

/***
 * Reads tsconfig metadata and detects strict TypeScript mode.
 */
async function hasTypeScriptStrictMode(root: string): Promise<boolean> {
  const tsconfig = await readJsonFile<TsConfigModel>(join(root, 'tsconfig.json'));
  return tsconfig?.compilerOptions?.strict === true;
}

/***
 * Reads the line coverage percentage from a coverage summary file when present.
 */
async function readCoveragePercent(root: string): Promise<number | null> {
  const coverage = await readJsonFile<CoverageSummaryModel>(
    join(root, 'coverage', 'coverage-summary.json'),
  );
  const value = coverage?.total?.lines?.pct;

  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/***
 * Formats integer and fractional percentages for badge labels.
 */
function formatPercent(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

/***
 * Selects the coverage badge color from the coverage percentage.
 */
function getCoverageColor(value: number): string {
  if (value >= 90) return '0a7f3f';
  if (value >= 75) return '65a30d';
  if (value >= 50) return 'ca8a04';
  return 'dc2626';
}

/***
 * Checks whether a named package script is configured.
 */
function hasScript(pkg: PackageJsonModel, name: string): boolean {
  return typeof pkg.scripts?.[name] === 'string' && pkg.scripts[name].length > 0;
}

/***
 * Checks whether a package script contains a specific command fragment.
 */
function scriptContains(pkg: PackageJsonModel, name: string, command: string): boolean {
  return pkg.scripts?.[name]?.includes(command) ?? false;
}

/***
 * Detects whether package metadata or workflows indicate Bun support.
 */
function supportsBun(pkg: PackageJsonModel, workflowFiles: readonly string[]): boolean {
  if (pkg.packageManager?.startsWith('bun@') ?? false) {
    return true;
  }

  if (
    Object.values(pkg.scripts ?? {}).some(
      (script) => script.includes('bun') || script.includes('bunx'),
    )
  ) {
    return true;
  }

  return workflowFiles.some(
    (workflow) =>
      workflow.includes('oven-sh/setup-bun') ||
      workflow.includes('bun install') ||
      /\bbun(?:x)?\b/.test(workflow),
  );
}

/***
 * Checks whether any workflow file invokes a named package script.
 */
function workflowRunsScript(workflowFiles: readonly string[], scriptName: string): boolean {
  const escaped = escapeRegExp(scriptName);
  const patterns = [
    new RegExp(`\\bbun\\s+run\\s+${escaped}(?=\\s|$)`, 'i'),
    new RegExp(`\\bnpm\\s+run\\s+${escaped}(?=\\s|$)`, 'i'),
    new RegExp(`\\bpnpm\\s+${escaped}(?=\\s|$)`, 'i'),
    new RegExp(`\\byarn\\s+${escaped}(?=\\s|$)`, 'i'),
  ];

  return workflowFiles.some((workflow) => patterns.some((pattern) => pattern.test(workflow)));
}

/***
 * Escapes regular expression syntax in a script name.
 */
function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/***
 * Reads all GitHub Actions workflow files from the repository.
 */
async function readWorkflowFiles(root: string): Promise<string[]> {
  const workflowsPath = join(root, '.github', 'workflows');
  const entries = await readDirectory(workflowsPath);

  const contents = await Promise.all(
    entries
      .filter((entry) => entry.endsWith('.yml') || entry.endsWith('.yaml'))
      .sort((a, b) => a.localeCompare(b))
      .map((entry) => readFile(join(workflowsPath, entry), 'utf-8')),
  );

  return contents;
}

/***
 * Reads a directory and treats a missing path as an empty directory.
 */
async function readDirectory(path: string): Promise<string[]> {
  try {
    return await readdir(path);
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return [];
    }

    throw new Error(`Unable to read workflow directory: ${path}`, { cause: error });
  }
}

/***
 * Checks whether an unknown error is a file-not-found filesystem error.
 */
function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

/***
 * Reads and parses a JSON file, returning null when the file does not exist.
 */
async function readJsonFile<T>(path: string): Promise<T | null> {
  let content: string;
  try {
    content = await readFile(path, 'utf-8');
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return null;
    }

    throw new Error(`Unable to read JSON metadata file: ${path}`, { cause: error });
  }

  try {
    return JSON.parse(content) as T;
  } catch (error: unknown) {
    throw new Error(`Unable to parse JSON metadata file: ${path}`, { cause: error });
  }
}

/***
 * Checks whether a filesystem path exists.
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return false;
    }

    throw error;
  }
}

/***
 * Sorts badges into the stable preferred display order.
 */
function sortBadges(badges: readonly AnalysisBadge[]): AnalysisBadge[] {
  return [...badges].sort((left, right) => {
    const order = getBadgeOrder(left.id) - getBadgeOrder(right.id);
    return order !== 0 ? order : left.id.localeCompare(right.id);
  });
}

/***
 * Returns the configured display order index for a badge id.
 */
function getBadgeOrder(id: string): number {
  const index = BADGE_ORDER.indexOf(id as (typeof BADGE_ORDER)[number]);
  return index === -1 ? BADGE_ORDER.length : index;
}
