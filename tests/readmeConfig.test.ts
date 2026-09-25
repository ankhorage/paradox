import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

import { analyze } from '../src/analyze/analyze.js';
import { buildModel } from '../src/model/buildModel.js';
import { render } from '../src/render/render.js';

describe('canonical README configuration', () => {
  test('renders schema metadata from src/types/config.ts and the concrete config instance', async () => {
    const fixture = await createConfigFixtureAsync();

    try {
      const analysis = await analyze(
        {
          docs: {
            title: 'Config Fixture',
            description: 'Fixture docs for canonical configuration.',
          },
          package: {
            entrypoints: ['src/index.ts'],
          },
        },
        {
          packageRoot: fixture.root,
          configFilePath: fixture.configFilePath,
        },
      );

      expect(analysis.config).toMatchObject({
        exportName: 'FixtureConfig',
        title: 'Configuration',
        description: 'Controls canonical fixture behavior.',
        isReadme: true,
      });
      expect(analysis.readmeConfig).toEqual({
        language: 'ts',
        code: [
          "import { defineFixtureConfig } from './src/index.js';",
          '',
          'export default defineFixtureConfig({',
          "  mode: 'write',",
          '});',
        ].join('\n'),
        sourcePath: 'paradox.config.ts',
      });

      const output = render(buildModel(analysis), { outputDir: 'paradox' });
      const configurationStart = output.readme.indexOf('## Configuration');
      const generatedDocsStart = output.readme.indexOf('## Generated documentation');
      const configuration = output.readme.slice(configurationStart, generatedDocsStart);

      expect(configuration).toContain('Controls canonical fixture behavior.');
      expect(configuration).toContain('### Example');
      expect(configuration).toContain("import { defineFixtureConfig } from './src/index.js';");
      expect(configuration).toContain("mode: 'write'");
      expect(configuration).toContain('<summary>Configuration options</summary>');
      expect(configuration).not.toContain('@config');
      expect(configuration).not.toContain('@readme');
      expect(configuration).not.toContain('/***');
    } finally {
      await rm(fixture.root, { force: true, recursive: true });
    }
  });
});

/***
 * Creates a canonical package with a schema-owned config contract and untagged config instance.
 */
async function createConfigFixtureAsync(): Promise<{
  root: string;
  configFilePath: string;
}> {
  const root = join(import.meta.dir, '.tmp', `config-${Date.now()}-${Math.random()}`);
  const configFilePath = join(root, 'paradox.config.ts');
  await mkdir(join(root, 'src', 'types'), { recursive: true });
  await mkdir(join(root, 'examples', 'basic-usage'), { recursive: true });

  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({
      name: '@fixture/config',
      version: '1.0.0',
      description: 'Fixture package for canonical configuration.',
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
    join(root, 'src', 'types', 'config.ts'),
    [
      '/***',
      ' * @title Configuration',
      ' *',
      ' * Controls canonical fixture behavior.',
      ' *',
      ' * @config',
      ' * @readme',
      ' */',
      'export interface FixtureConfig {',
      '  /*** Write behavior. */',
      "  mode?: 'safe' | 'write';",
      '}',
      '',
    ].join('\n'),
  );
  await writeFile(
    join(root, 'src', 'index.ts'),
    [
      "export type { FixtureConfig } from './types/config.js';",
      '',
      '/*** Defines fixture configuration without changing its shape. */',
      'export function defineFixtureConfig(config: import("./types/config.js").FixtureConfig) {',
      '  return config;',
      '}',
      '',
    ].join('\n'),
  );
  await writeFile(
    join(root, 'examples', 'basic-usage', 'index.ts'),
    [
      '/***',
      ' * @title Basic Usage',
      ' *',
      ' * Demonstrates the fixture.',
      ' *',
      ' * @usage',
      ' * @readme',
      ' */',
      "export const basicUsage = 'config';",
      '',
    ].join('\n'),
  );
  await writeFile(
    configFilePath,
    [
      "import { defineFixtureConfig } from './src/index.js';",
      '',
      'export default defineFixtureConfig({',
      "  mode: 'write',",
      '});',
      '',
    ].join('\n'),
  );

  return { root, configFilePath };
}
