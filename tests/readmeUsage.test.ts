import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { DOCUMENTATION_RULE_METADATA } from '@ankhorage/rules-documentation';
import { describe, expect, test } from 'bun:test';

import { analyze } from '../src/analyze/analyze.js';
import { buildModel } from '../src/model/buildModel.js';
import { render } from '../src/render/render.js';
import { createCliAvailabilityFixtureAsync } from './utils/createCliAvailabilityFixtureAsync.js';

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

      expect(DOCUMENTATION_RULE_METADATA.readmeUsage.chapterCount).toBe(1);
      expect(DOCUMENTATION_RULE_METADATA.readmeUsage.sectionOrder).toEqual(['cli', 'programmatic']);

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
      expect(DOCUMENTATION_RULE_METADATA.readmeUsage.sourceCode.includeSourcePath).toBe(false);
      expect(output.readme).not.toContain('Source: `examples/basic-usage/index.ts`');
      expect(output.readme).not.toContain('advancedUsage');
      expect(output.readme).not.toContain('/***');
      expect(output.readme).not.toContain('@usage');

      expect(DOCUMENTATION_RULE_METADATA.readmeUsage.fullDocumentation.includeAllUsageEntries).toBe(
        true,
      );
      expect(output.indexHtml).toContain('Advanced Usage');
      expect(output.indexHtml).toContain('Second Advanced Usage');
      expect(output.indexHtml).toContain('examples/advanced/index.ts');
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  test('keeps CLI availability consistent across generated artifacts', async () => {
    const fixtures = await Promise.all([
      createCliAvailabilityFixtureAsync({ name: '@fixture/commands', provider: 'commands' }),
      createCliAvailabilityFixtureAsync({ name: '@fixture/no-provider', provider: 'none' }),
      createCliAvailabilityFixtureAsync({ name: '@fixture/events', provider: 'events' }),
      createCliAvailabilityFixtureAsync({ name: '@fixture/bin', provider: 'bin' }),
      createCliAvailabilityFixtureAsync({
        name: '@fixture/programmatic',
        provider: 'programmatic',
      }),
      createCliAvailabilityFixtureAsync({ name: '@ankhorage/zora', provider: 'zora' }),
      createCliAvailabilityFixtureAsync({
        name: '@fixture/package-name',
        category: 'document',
        provider: 'commands',
      }),
    ]);

    try {
      const results = await Promise.all(
        fixtures.map(async (fixture) => ({
          fixture,
          analysis: await analyze(
            { package: { entrypoints: ['src/index.ts'] } },
            { packageRoot: relative(process.cwd(), fixture.root) },
          ),
          absoluteUsage: (
            await analyze(
              { package: { entrypoints: ['src/index.ts'] } },
              { packageRoot: fixture.root },
            )
          ).usage,
        })),
      );

      for (const { fixture, analysis, absoluteUsage } of results) {
        const output = render(buildModel(analysis), { outputDir: 'paradox' });
        const paradoxJson = JSON.parse(output.paradoxJson) as { usage: { command: string | null } };
        const hasCli = fixture.provider === 'commands';
        const command = hasCli ? `ankh ${fixture.category} --help` : null;

        expect(analysis.usage.command).toBe(command);
        expect(analysis.usage).toEqual(absoluteUsage);
        expect(paradoxJson.usage.command).toBe(command);
        expect(output.readme.includes('### CLI')).toBe(hasCli);
        expect(output.indexHtml.includes('<h3>CLI</h3>')).toBe(hasCli);
        expect(command !== null && output.readme.includes(command)).toBe(hasCli);
        expect(command !== null && output.indexHtml.includes(command)).toBe(hasCli);
      }

      const programmatic = results.find(({ fixture }) => fixture.provider === 'programmatic');
      if (programmatic === undefined) throw new Error('Expected a programmatic-only fixture.');
      expect(programmatic.analysis.usageEntries).toHaveLength(1);
      const programmaticOutput = render(buildModel(programmatic.analysis), {
        outputDir: 'paradox',
      });
      expect(programmaticOutput.readme).toContain('### Programmatic Usage');
      expect(programmaticOutput.readme).toContain("export const usage = 'programmatic';");
    } finally {
      await Promise.all(
        fixtures.map((fixture) => rm(fixture.root, { force: true, recursive: true })),
      );
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
  const capability = {
    id: 'usage.run',
    owner: '@fixture/usage',
    access: ['invoke'],
    binding: { kind: 'action', bindableAs: ['target'] },
  };
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
      ankh: {
        category: 'usage',
        provider: './provider.mjs',
        capabilities: [capability],
      },
    }),
  );
  await writeFile(
    join(root, 'provider.mjs'),
    `export default ${JSON.stringify({
      id: '@fixture/usage',
      category: 'usage',
      version: '1.0.0',
      capabilities: [capability],
      commands: [{ path: ['run'], summary: 'Run the fixture.', capability: 'usage.run' }],
    })};\n`,
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
