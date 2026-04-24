import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

import { analyze } from '../src/analyze/analyze.js';
import { createUsageFromPackageJson } from '../src/analyze/usage.js';
import { buildModel } from '../src/model/buildModel.js';
import { render } from '../src/render/render.js';

const fixtureRoot = join(import.meta.dir, 'fixtures/basic');
const multiBinFixtureRoot = join(import.meta.dir, 'fixtures/multi-bin');
const snapshotRoot = join(import.meta.dir, '__snapshots__');

describe('analyze', () => {
  test('builds documentation from package entrypoints', async () => {
    const analysis = await analyze({
      docs: {
        title: 'Fixture Docs',
        description: 'Generated fixture docs.',
      },
      package: {
        root: fixtureRoot,
        entrypoints: ['src/index.ts'],
      },
    });

    expect(analysis.exports.map((item) => item.name)).toEqual([
      'Button',
      'ToolConfig',
      'ButtonProps',
    ]);
    expect(analysis.exports.map((item) => item.name)).not.toContain('internalHelper');
    expect(analysis.usage).toEqual({
      packageName: '@fixture/basic',
      commands: [
        {
          name: 'fixture-basic',
          command: 'bunx @fixture/basic',
        },
      ],
    });
    expect(analysis.config).toEqual({
      exportName: 'ToolConfig',
    });

    expect(analysis.components).toEqual([
      {
        name: 'Button',
        description: 'Renders the fixture button component.',
        props: [
          {
            name: 'label',
            type: 'string',
            required: true,
            description: 'Visible button label.',
          },
          {
            name: 'disabled',
            type: 'boolean | undefined',
            required: false,
            description: 'Optional disabled state.',
          },
        ],
      },
    ]);

    const output = render(buildModel(analysis));

    await expectSnapshot('basic.readme.md', output.readme);
    await expectSnapshot('basic.exports.md', output.exportsMarkdown);
    await expectSnapshot('basic.components.md', output.components);
  });

  test('renders multiple bin commands deterministically', async () => {
    const analysis = await analyze({
      docs: {
        title: 'Multi Bin Fixture',
        description: 'Fixture docs for multiple binaries.',
      },
      package: {
        root: multiBinFixtureRoot,
        entrypoints: ['src/index.ts'],
      },
    });

    expect(analysis.usage).toEqual({
      packageName: 'fixture-multi-bin',
      commands: [
        {
          name: 'alpha',
          command: 'bunx fixture-multi-bin alpha',
        },
        {
          name: 'beta',
          command: 'bunx fixture-multi-bin beta',
        },
      ],
    });

    const output = render(buildModel(analysis));

    await expectSnapshot('multi-bin.readme.md', output.readme);
  });

  test('normalizes string bin usage', () => {
    expect(
      createUsageFromPackageJson({
        name: 'fixture-string-bin',
        bin: './src/cli.ts',
      }),
    ).toEqual({
      packageName: 'fixture-string-bin',
      commands: [
        {
          name: 'fixture-string-bin',
          command: 'bunx fixture-string-bin',
        },
      ],
    });
  });

  test('normalizes missing bin usage', () => {
    expect(
      createUsageFromPackageJson({
        name: 'fixture-no-bin',
      }),
    ).toBeNull();
  });

  test('normalizes scoped string bin usage', () => {
    expect(
      createUsageFromPackageJson({
        name: '@fixture/string-bin',
        bin: './src/cli.ts',
      }),
    ).toEqual({
      packageName: '@fixture/string-bin',
      commands: [
        {
          name: 'string-bin',
          command: 'bunx @fixture/string-bin',
        },
      ],
    });
  });
});

async function expectSnapshot(name: string, actual: string): Promise<void> {
  const expected = await readFile(join(snapshotRoot, name), 'utf-8');

  expect(actual.trimEnd()).toBe(expected.trimEnd());
}
