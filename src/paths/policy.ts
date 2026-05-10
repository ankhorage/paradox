import { access } from 'node:fs/promises';
import { dirname, isAbsolute, join, normalize, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { ParadoxConfig } from '../config/types.js';

const CONFIG_FILENAMES = [
  'paradox.config.ts',
  'paradox.config.js',
  'paradox.config.mjs',
  'paradox.config.cjs',
] as const;

export async function findParadoxConfigFile(startDir: string): Promise<string | null> {
  let current = resolve(startDir);
  let parent = dirname(current);

  while (parent !== current) {
    for (const filename of CONFIG_FILENAMES) {
      const candidate = join(current, filename);
      if (await pathExists(candidate)) return candidate;
    }

    current = parent;
    parent = dirname(current);
  }

  for (const filename of CONFIG_FILENAMES) {
    const candidate = join(current, filename);
    if (await pathExists(candidate)) return candidate;
  }

  return null;
}

export async function loadParadoxConfig(configFilePath: string): Promise<ParadoxConfig> {
  const url = pathToFileURL(configFilePath).href;
  const mod = (await import(url)) as { default?: ParadoxConfig };
  return mod.default ?? {};
}

export async function resolvePackageRoot(
  config: ParadoxConfig,
  configDir: string,
): Promise<string> {
  const configuredRoot = config.package?.root;
  const resolvedRoot = configuredRoot
    ? isAbsolute(configuredRoot)
      ? configuredRoot
      : resolve(configDir, configuredRoot)
    : resolve(configDir);

  await assertPathExists(
    join(resolvedRoot, 'package.json'),
    `Unable to find package.json at resolved package root: ${resolvedRoot}`,
  );

  return resolvedRoot;
}

export function resolveOutputRoot(
  config: ParadoxConfig,
  packageRoot: string,
): { outputDir: string; outputRoot: string } {
  const outputDir = config.output?.dir ?? 'paradox';
  validateOutputDir(outputDir);

  const outputRoot = resolve(packageRoot, outputDir);
  assertWithinRoot(
    outputRoot,
    packageRoot,
    `Resolved output directory escapes package root: ${outputRoot}`,
  );

  return { outputDir, outputRoot };
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function assertPathExists(path: string, message: string): Promise<void> {
  if (!(await pathExists(path))) {
    throw new Error(message);
  }
}

function validateOutputDir(outputDir: string): void {
  const trimmed = outputDir.trim();
  if (trimmed.length === 0) {
    throw new Error('Invalid output.dir: must be a non-empty string.');
  }

  const normalized = normalize(trimmed);
  if (normalized === '.' || normalized === '') {
    throw new Error('Invalid output.dir: must not be ".".');
  }

  if (isAbsolute(normalized)) {
    throw new Error(
      'Invalid output.dir: must be a relative path inside the package root (absolute paths are not allowed).',
    );
  }

  // Reject explicit parent traversal to keep writes deterministic and scoped.
  for (const segment of splitPathSegments(trimmed)) {
    if (segment === '..') {
      throw new Error('Invalid output.dir: must not contain ".." path segments.');
    }
  }
}

function splitPathSegments(path: string): string[] {
  // Treat both separators as potential delimiters to stay robust across platforms/config styles.
  const normalized = path.replaceAll('\\', '/');
  return normalized.split('/').filter((segment) => segment.length > 0 && segment !== '.');
}

function assertWithinRoot(resolvedPath: string, root: string, message: string): void {
  const rel = relative(root, resolvedPath);
  if (rel === '') return;
  if (rel === '..' || rel.startsWith(`..${sep}`)) {
    throw new Error(message);
  }
}
