import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

import {
  createTempDir,
  listFiles,
  overwriteFixtureConfig,
  runCli,
  writeFixturePackage,
} from './utils/cliFixture.js';

describe('cli e2e', () => {
  test('writes artifacts to <packageRoot>/paradox when invoked from package root', async () => {
    const tempRoot = await createTempDir('paradox-cli-e2e-');
    try {
      const pkgRoot = join(tempRoot, 'pkg');
      await writeFixturePackage(pkgRoot, {
        name: '@fixture/cli-basic',
        mode: 'safe',
      });

      const before = await listFiles(tempRoot);
      const result = await runCli({ cwd: pkgRoot });
      const after = await listFiles(tempRoot);

      expect(result.exitCode).toBe(0);
      expectAddedFiles(before, after, [
        'pkg/paradox/badges/docs.svg',
        'pkg/paradox/badges/npm.svg',
        'pkg/paradox/badges/typescript.svg',
        'pkg/paradox/exports.md',
        'pkg/paradox/components.md',
        'pkg/paradox/exports.json',
        'pkg/paradox/diagrams/architecture-overview.mmd',
        'pkg/paradox/diagrams/export-graph.mmd',
        'pkg/paradox/diagrams/module-relationships.mmd',
        'pkg/paradox/index.html',
        'pkg/paradox/paradox.json',
      ]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test('writes artifacts to <packageRoot>/paradox when invoked from a package subdirectory', async () => {
    const tempRoot = await createTempDir('paradox-cli-e2e-');
    try {
      const pkgRoot = join(tempRoot, 'pkg');
      await writeFixturePackage(pkgRoot, {
        name: '@fixture/cli-subdir',
        mode: 'safe',
      });

      const cwd = join(pkgRoot, 'src');
      const before = await listFiles(tempRoot);
      const result = await runCli({ cwd });
      const after = await listFiles(tempRoot);

      expect(result.exitCode).toBe(0);
      expectAddedFiles(before, after, [
        'pkg/paradox/badges/docs.svg',
        'pkg/paradox/badges/npm.svg',
        'pkg/paradox/badges/typescript.svg',
        'pkg/paradox/exports.md',
        'pkg/paradox/components.md',
        'pkg/paradox/exports.json',
        'pkg/paradox/diagrams/architecture-overview.mmd',
        'pkg/paradox/diagrams/export-graph.mmd',
        'pkg/paradox/diagrams/module-relationships.mmd',
        'pkg/paradox/index.html',
        'pkg/paradox/paradox.json',
      ]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test('fails without config and does not write any artifacts', async () => {
    const tempRoot = await createTempDir('paradox-cli-e2e-');
    try {
      const monoRoot = join(tempRoot, 'monorepo');
      const pkgRoot = join(monoRoot, 'packages', 'app');

      await mkdir(pkgRoot, { recursive: true });
      await writeFile(
        join(monoRoot, 'package.json'),
        JSON.stringify({ name: 'fixture-monorepo-root', version: '0.0.0' }, null, 2),
      );

      // Package exists but does not contain paradox.config.*
      await writeFile(
        join(pkgRoot, 'package.json'),
        JSON.stringify({ name: '@fixture/monorepo-app', version: '0.0.0' }, null, 2),
      );
      await writeFile(
        join(pkgRoot, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'ESNext' } }, null, 2),
      );
      await mkdir(join(pkgRoot, 'src', 'types'), { recursive: true });
  await mkdir(join(pkgRoot, 'examples', 'basic-usage'), { recursive: true });
      await writeFile(join(pkgRoot, 'src', 'index.ts'), 'export const value = 1;\n');

      const before = await listFiles(tempRoot);
      const result = await runCli({ cwd: monoRoot });
      const after = await listFiles(tempRoot);

      expect(result.exitCode).not.toBe(0);
      expect(after).toEqual(before);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test('supports custom output.dir relative to packageRoot', async () => {
    const tempRoot = await createTempDir('paradox-cli-e2e-');
    try {
      const pkgRoot = join(tempRoot, 'pkg');
      await writeFixturePackage(pkgRoot, {
        name: '@fixture/cli-custom-output',
        mode: 'safe',
        outputDir: 'docs/paradox',
      });

      const before = await listFiles(tempRoot);
      const result = await runCli({ cwd: join(pkgRoot, 'src') });
      const after = await listFiles(tempRoot);

      expect(result.exitCode).toBe(0);
      expectAddedFiles(before, after, [
        'pkg/docs/paradox/badges/docs.svg',
        'pkg/docs/paradox/badges/npm.svg',
        'pkg/docs/paradox/badges/typescript.svg',
        'pkg/docs/paradox/exports.md',
        'pkg/docs/paradox/components.md',
        'pkg/docs/paradox/exports.json',
        'pkg/docs/paradox/diagrams/architecture-overview.mmd',
        'pkg/docs/paradox/diagrams/export-graph.mmd',
        'pkg/docs/paradox/diagrams/module-relationships.mmd',
        'pkg/docs/paradox/index.html',
        'pkg/docs/paradox/paradox.json',
      ]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test('only updates README.md in write mode', async () => {
    const tempRoot = await createTempDir('paradox-cli-e2e-');
    try {
      const pkgRoot = join(tempRoot, 'pkg');
      await writeFixturePackage(pkgRoot, {
        name: '@fixture/cli-write-mode',
        mode: 'safe',
      });

      const readmePath = join(pkgRoot, 'README.md');
      const originalReadme = await readFile(readmePath, 'utf-8');

      const safeRun = await runCli({ cwd: pkgRoot });
      expect(safeRun.exitCode).toBe(0);
      expect(await readFile(readmePath, 'utf-8')).toBe(originalReadme);

      await overwriteFixtureConfig(pkgRoot, { mode: 'write' });
      const writeRun = await runCli({ cwd: pkgRoot });
      expect(writeRun.exitCode).toBe(0);
      expect(await readFile(readmePath, 'utf-8')).not.toBe(originalReadme);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test('rejects collaborators false from an untyped config without writing artifacts', async () => {
    const tempRoot = await createTempDir('paradox-cli-e2e-');
    try {
      const pkgRoot = join(tempRoot, 'pkg');
      await writeFixturePackage(pkgRoot, {
        name: '@fixture/cli-invalid-collaborators',
        mode: 'write',
      });
      await rm(join(pkgRoot, 'paradox.config.ts'));
      await writeFile(
        join(pkgRoot, 'paradox.config.mjs'),
        [
          'export default {',
          "  mode: 'write',",
          '  collaborators: false,',
          "  package: { entrypoints: ['src/index.ts'] },",
          '};',
          '',
        ].join('\n'),
      );

      const readmePath = join(pkgRoot, 'README.md');
      const originalReadme = await readFile(readmePath, 'utf-8');
      const before = await listFiles(tempRoot);
      const result = await runCli({ cwd: pkgRoot });
      const after = await listFiles(tempRoot);

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('Invalid collaborators config');
      expect(after).toEqual(before);
      expect(await readFile(readmePath, 'utf-8')).toBe(originalReadme);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });


  test('rejects invalid documentation policy before writing artifacts', async () => {
    const tempRoot = await createTempDir('paradox-cli-policy-');
    try {
      const pkgRoot = join(tempRoot, 'pkg');
      await writeFixturePackage(pkgRoot, {
        name: '@fixture/cli-invalid-policy',
        mode: 'write',
      });
      await writeFile(
        join(pkgRoot, 'src', 'invalid.ts'),
        [
          '/***',
          ' * Invalid usage location.',
          ' * @usage',
          ' */',
          "export const invalidUsage = 'invalid';",
          '',
        ].join('\n'),
      );

      const before = await listFiles(tempRoot);
      const result = await runCli({ cwd: pkgRoot });
      const after = await listFiles(tempRoot);

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('Paradox documentation policy is invalid');
      expect(result.stderr).toContain('documentation.usage.location');
      expect(after).toEqual(before);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test('rejects output.dir with parent traversal and does not write any artifacts', async () => {
    const tempRoot = await createTempDir('paradox-cli-e2e-');
    try {
      const pkgRoot = join(tempRoot, 'pkg');
      await writeFixturePackage(pkgRoot, {
        name: '@fixture/cli-invalid-output',
        mode: 'safe',
        outputDir: '../paradox',
      });

      const before = await listFiles(tempRoot);
      const result = await runCli({ cwd: join(pkgRoot, 'src') });
      const after = await listFiles(tempRoot);

      expect(result.exitCode).not.toBe(0);
      expect(after).toEqual(before);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});

function expectAddedFiles(before: string[], after: string[], expectedAdded: string[]): void {
  const beforeSet = new Set(before);
  const added = after.filter((path) => !beforeSet.has(path));

  expect(added.sort()).toEqual([...expectedAdded].sort());
}
