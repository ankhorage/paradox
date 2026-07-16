import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

import { analyze } from '../src/analyze/analyze.js';
import { buildModel } from '../src/model/buildModel.js';
import { render } from '../src/render/render.js';

const configTag = `${String.fromCharCode(64)}config`;
const readmeTag = `${String.fromCharCode(64)}readme`;

describe('readme configuration source', () => {
  test('renders the actual tagged config file instead of synthesized boilerplate', async () => {
    const fixture = await createConfigFixture(true);

    try {
      const analysis = await analyze(
        {
          docs: {
            title: 'Config Fixture',
            description: 'Fixture docs for source-backed configuration.',
          },
          package: {
            root: fixture.root,
            entrypoints: ['src/index.ts'],
          },
        },
        {
          packageRoot: fixture.root,
          configFilePath: fixture.configFilePath,
        },
      );

      expect(analysis.readmeConfig).toEqual({
        description: 'Canonical fixture configuration.',
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
      const configurationSection = output.readme.slice(configurationStart, generatedDocsStart);

      expect(configurationSection).toContain('Canonical fixture configuration.');
      expect(configurationSection).toContain(
        "import { defineFixtureConfig } from './src/index.js';",
      );
      expect(configurationSection).toContain("mode: 'write'");
      expect(configurationSection).toContain('<summary>Configuration options</summary>');
      expect(configurationSection).not.toContain('Create a `fixture.config.ts` file:');
      expect(configurationSection).not.toContain('// ...');
      expect(configurationSection).not.toContain(configTag);
      expect(configurationSection).not.toContain(readmeTag);
      expect(configurationSection).not.toContain('/***');
    } finally {
      await rm(fixture.root, { force: true, recursive: true });
    }
  });

  test('requires readme opt-in on the leading config comment', async () => {
    const fixture = await createConfigFixture(false);

    try {
      const analysis = await analyze(
        {
          docs: {
            title: 'Config Fixture',
          },
          package: {
            root: fixture.root,
            entrypoints: ['src/index.ts'],
          },
        },
        {
          packageRoot: fixture.root,
          configFilePath: fixture.configFilePath,
        },
      );

      expect(analysis.readmeConfig).toBeNull();

      const output = render(buildModel(analysis), { outputDir: 'paradox' });
      const configurationStart = output.readme.indexOf('## Configuration');
      const generatedDocsStart = output.readme.indexOf('## Generated documentation');
      const configurationSection = output.readme.slice(configurationStart, generatedDocsStart);

      expect(configurationSection).toContain('<summary>Configuration options</summary>');
      expect(configurationSection).not.toContain('defineFixtureConfig({');
    } finally {
      await rm(fixture.root, { force: true, recursive: true });
    }
  });
});

async function createConfigFixture(includeReadmeTag: boolean): Promise<{
  root: string;
  configFilePath: string;
}> {
  const root = join(import.meta.dir, '.tmp', `config-${Date.now()}-${Math.random()}`);
  const configFilePath = join(root, 'paradox.config.ts');
  await mkdir(join(root, 'src'), { recursive: true });

  await writeFile(
    join(root, 'package.json'),
    JSON.stringify(
      {
        name: '@fixture/config',
        version: '1.0.0',
        description: 'Fixture package for source-backed configuration.',
        license: 'MIT',
        scripts: {
          build: 'tsc --noEmit',
          lint: 'eslint .',
          test: 'bun test',
        },
        devDependencies: {
          typescript: '^5.9.3',
        },
      },
      null,
      2,
    ),
  );

  await writeFile(
    join(root, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          strict: true,
          skipLibCheck: true,
        },
        include: ['src'],
      },
      null,
      2,
    ),
  );

  await writeFile(
    join(root, 'src/index.ts'),
    [
      '/***',
      ' * Fixture configuration schema.',
      ' *',
      ` * ${configTag}`,
      ` * ${readmeTag}`,
      ' */',
      'export interface FixtureConfig {',
      "  mode?: 'safe' | 'write';",
      '}',
      '',
      'export function defineFixtureConfig(config: FixtureConfig): FixtureConfig {',
      '  return config;',
      '}',
    ].join('\n'),
  );

  await writeFile(
    configFilePath,
    [
      '/***',
      ' * Canonical fixture configuration.',
      ' *',
      ` * ${configTag}`,
      ...(includeReadmeTag ? [` * ${readmeTag}`] : []),
      ' */',
      "import { defineFixtureConfig } from './src/index.js';",
      '',
      'export default defineFixtureConfig({',
      "  mode: 'write',",
      '});',
    ].join('\n'),
  );

  return { root, configFilePath };
}
