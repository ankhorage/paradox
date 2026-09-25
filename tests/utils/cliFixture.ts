import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dir, '../..');
const cliPath = join(repoRoot, 'src', 'cli', 'standalone.ts');

export interface CliFixtureOptions {
  readonly name: string;
  readonly mode: 'safe' | 'write';
  readonly outputDir?: string;
}

/***
 * Creates a unique temporary directory for CLI integration fixtures.
 */
export async function createTempDir(prefix: string): Promise<string> {
  const base = join(tmpdir(), `${prefix}${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await mkdir(base, { recursive: true });
  return base;
}

/***
 * Writes one canonical package fixture suitable for running Paradox end to end.
 */
export async function writeFixturePackage(
  pkgRoot: string,
  options: CliFixtureOptions,
): Promise<void> {
  await mkdir(join(pkgRoot, 'src', 'types'), { recursive: true });
  await mkdir(join(pkgRoot, 'examples', 'basic-usage'), { recursive: true });
  await writeFixtureMetadataAsync(pkgRoot, options.name);
  await writeCanonicalSourcesAsync(pkgRoot);
  await writeFile(join(pkgRoot, 'README.md'), '# Fixture\n');
  await overwriteFixtureConfig(pkgRoot, {
    mode: options.mode,
    outputDir: options.outputDir,
  });
}

/***
 * Rewrites only the concrete Paradox config instance for one CLI fixture.
 */
export async function overwriteFixtureConfig(
  pkgRoot: string,
  options: { mode: 'safe' | 'write'; outputDir?: string },
): Promise<void> {
  const outputDirLine = options.outputDir
    ? `  output: { dir: ${JSON.stringify(options.outputDir)} },\n`
    : '';
  const contents = `export default {\n  mode: ${JSON.stringify(options.mode)},\n  package: { entrypoints: ['src/index.ts'] },\n${outputDirLine}};\n`;

  await writeFile(join(pkgRoot, 'paradox.config.ts'), contents);
}

/***
 * Runs the source CLI against one fixture directory.
 */
export async function runCli(options: {
  cwd: string;
}): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const child = Bun.spawn([process.execPath, cliPath], {
    cwd: options.cwd,
    env: { ...process.env },
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const [stdout, stderr] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);

  return { exitCode: await child.exited, stdout, stderr };
}

/***
 * Lists all fixture files relative to the supplied root.
 */
export async function listFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  await walkFilesAsync(root, root, files);
  return files.sort();
}

/***
 * Writes package and TypeScript metadata for one CLI fixture.
 */
async function writeFixtureMetadataAsync(pkgRoot: string, name: string): Promise<void> {
  await writeFile(
    join(pkgRoot, 'package.json'),
    JSON.stringify({ name, version: '0.0.0' }, null, 2),
  );
  await writeFile(
    join(pkgRoot, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          strict: true,
        },
        include: ['src/**/*.ts', 'examples/**/*.ts'],
      },
      null,
      2,
    ),
  );
}

/***
 * Writes canonical config and README-usage source files for one CLI fixture.
 */
async function writeCanonicalSourcesAsync(pkgRoot: string): Promise<void> {
  await writeFile(
    join(pkgRoot, 'src', 'types', 'config.ts'),
    [
      '/***',
      ' * @title Configuration',
      ' *',
      ' * Configures the CLI fixture.',
      ' *',
      ' * @config',
      ' * @readme',
      ' */',
      'export interface CliFixtureConfig {}',
      '',
    ].join('\n'),
  );
  await writeFile(
    join(pkgRoot, 'src', 'index.ts'),
    "export type { CliFixtureConfig } from './types/config.js';\n",
  );
  await writeFile(
    join(pkgRoot, 'examples', 'basic-usage', 'index.ts'),
    [
      '/***',
      ' * @title Basic Usage',
      ' *',
      ' * Demonstrates the CLI fixture.',
      ' *',
      ' * @usage',
      ' * @readme',
      ' */',
      "export const basicUsage = 'cli';",
      '',
    ].join('\n'),
  );
}

/***
 * Recursively collects files while following fixture-local directory symlinks.
 */
async function walkFilesAsync(root: string, dir: string, files: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() || (entry.isSymbolicLink() && (await isDirectoryAsync(fullPath)))) {
      await walkFilesAsync(root, fullPath, files);
    } else {
      files.push(relative(root, fullPath));
    }
  }
}

/***
 * Checks whether one symlink target resolves to a directory.
 */
async function isDirectoryAsync(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}
