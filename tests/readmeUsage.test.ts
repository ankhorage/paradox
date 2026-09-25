import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { DOCUMENTATION_POLICY } from '@ankhorage/policy/documentation';
import { describe, expect, test } from 'bun:test';

import { analyze } from '../src/analyze/analyze.js';
import { buildModel } from '../src/model/buildModel.js';
import { render } from '../src/render/render.js';

describe('canonical README usage', () => {
  test('renders CLI first and promotes exactly one programmatic example', async () => {
    const root = await createUsageFixtureAsync();

    try {
      const analysis = await analyze(
        {
          docs: {
            title: 'Usage Fixture',
            description: 'Fixture docs for canonical usage.',
          },
          package: {
            entrypoints: ['src/index.ts'],
          },
        },
        { packageRoot: root },
      );
      const output = render(buildModel(analysis), { outputDir: 'paradox' });

      expect(analysis.usage).toEqual({
        packageName: '@fixture/usage',
        command: 'ankh usage --help',
      });
      expect(analysis.exampleCount).toBe(2);
      expect(analysis.usageEntries).toHaveLength(4);

      expect(DOCUMENTATION_POLICY.readmeUsage.chapterCount).toBe(1);
      expect(DOCUMENTATION_POLICY.readmeUsage.sectionOrder).toEqual(['cli', 'programmatic']);

      const usageStart = output.readme.indexOf('## Usage');
      const cliStart = output.readme.indexOf('### CLI');
      const exampleStart = output.readme.indexOf('### Basic Usage');

      expect(usageStart).toBeGreaterThan(-1);
      expect(cliStart).toBeGreaterThan(usageStart);
      expect(exampleStart).toBeGreaterThan(cliStart);
      expect(output.readme).toContain('ankh usage --help');
      expect(output.readme).toContain('Demonstrates the canonical programmatic entry point.');
      expect(output.readme).toContain("export const basicUsage = 'basic';");
      expect(output.readme).toContain(
        'This package contains 1 additional example. See the generated documentation for the complete set.',
      );
      expect(DOCUMENTATION_POLICY.readmeUsage.sourceCode.includeSourcePath).toBe(false);
      expect(output.readme).not.toContain('Source: `examples/basic-usage/index.ts`');
      expect(output.readme).not.toContain('advancedUsage');
      expect(output.readme).not.toContain('/***');
      expect(output.readme).not.toContain('@usage');

      expect(DOCUMENTATION_POLICY.readmeUsage.fullDocumentation.includeAllUsageEntries).toBe(true);
      expect(output.indexHtml).toContain('Advanced Usage');
      expect(output.indexHtml).toContain('Second Advanced Usage');
      expect(output.indexHtml).toContain('examples/advanced/index.ts');
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  test('extracts only the declaration owned by each usage comment', async () => {
    const root = await createUsageFixtureAsync();

    try {
      const analysis = await analyze(
        {
          package: {
            entrypoints: ['src/index.ts'],
          },
        },
        { packageRoot: root },
      );

      const advanced = analysis.usageEntries.filter(
        (entry) => entry.sourcePath === 'examples/advanced/index.ts',
      );

      expect(advanced).toHaveLength(2);
      expect(advanced[0]?.code).toBe("export const advancedUsage = 'advanced';");
      expect(advanced[1]?.code).toBe("export const secondAdvancedUsage = 'second';");
      for (const entry of advanced) {
        expect(entry.code).not.toContain('/***');
        expect(entry.code).not.toContain('@usage');
        expect(entry.code).not.toContain('@readme');
      }
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });
});

/***
 * Creates a canonical package with CLI usage, two example directories, and one README promotion.
 */
async function createUsageFixtureAsync(): Promise<string> {
  const root = join(import.meta.dir, '.tmp', `usage-${Date.now()}-${Math.random()}`);
  await mkdir(join(root, 'src', 'types'), { recursive: true });
  await mkdir(join(root, 'src', 'cli'), { recursive: true });
  await mkdir(join(root, 'examples', 'basic-usage'), { recursive: true });
  await mkdir(join(root, 'examples', 'advanced'), { recursive: true });

  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({
      name: '@fixture/usage',
      version: '1.0.0',
      description: 'Fixture package for canonical usage.',
      license: 'MIT',
    }),
  );
  await writeFile(
    join(root, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        strict: true,
        skipLibCheck: true,
      },
      include: ['src', 'examples'],
    }),
  );
  await writeFile(
    join(root, 'src', 'index.ts'),
    [
      '/***',
      ' * Returns the fixture name.',
      ' */',
      "export function getFixtureName(): string { return 'usage'; }",
      '',
      "export type { UsageConfig } from './types/config.js';",
      '',
    ].join('\n'),
  );
  await writeFile(
    join(root, 'src', 'types', 'config.ts'),
    [
      '/***',
      ' * @title Configuration',
      ' *',
      ' * Configures the canonical usage fixture.',
      ' *',
      ' * @config',
      ' * @readme',
      ' */',
      'export interface UsageConfig {',
      '  /*** Enables the fixture. */',
      '  enabled?: boolean;',
      '}',
      '',
    ].join('\n'),
  );
  await writeFile(
    join(root, 'src', 'cli', 'index.ts'),
    [
      '/***',
      ' * Describes the fixture CLI.',
      ' *',
      ' * @title CLI',
      ' * @usage',
      ' */',
      "export const cliUsage = 'cli';",
      '',
    ].join('\n'),
  );
  await writeFile(
    join(root, 'examples', 'basic-usage', 'index.ts'),
    [
      '/***',
      ' * @title Basic Usage',
      ' *',
      ' * Demonstrates the canonical programmatic entry point.',
      ' *',
      ' * @usage',
      ' * @readme',
      ' */',
      "export const basicUsage = 'basic';",
      '',
    ].join('\n'),
  );
  await writeFile(
    join(root, 'examples', 'advanced', 'index.ts'),
    [
      '/***',
      ' * Advanced package behavior.',
      ' *',
      ' * @title Advanced Usage',
      ' * @usage',
      ' */',
      "export const advancedUsage = 'advanced';",
      '',
      '/***',
      ' * Another advanced declaration in the same source file.',
      ' *',
      ' * @title Second Advanced Usage',
      ' * @usage',
      ' */',
      "export const secondAdvancedUsage = 'second';",
      '',
    ].join('\n'),
  );

  return root;
}
