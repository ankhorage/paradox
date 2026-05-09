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
    const analysis = await analyze(
      {
        docs: {
          title: 'Fixture Docs',
          description: 'Generated fixture docs.',
        },
        package: {
          root: fixtureRoot,
          entrypoints: ['src/index.ts'],
        },
      },
      { packageRoot: fixtureRoot },
    );

    expect(analysis.exports.map((item) => item.name)).toEqual([
      'Button',
      'createButtonState',
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
        modulePath: 'src/ui.ts',
        sourceLocation: {
          filePath: 'src/ui.ts',
          line: 28,
          column: 1,
        },
        exportPaths: ['src/index.ts'],
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

    const createButtonStateExport = findExport(analysis, 'createButtonState');
    expect(createButtonStateExport.modulePath).toBe('src/ui.ts');
    expect(createButtonStateExport.exportPaths).toEqual(['src/index.ts']);
    expect(createButtonStateExport.relatedSymbols).toEqual(['ButtonProps']);
    expect(createButtonStateExport.sourceLocation).toEqual({
      filePath: 'src/ui.ts',
      line: 41,
      column: 1,
    });
    expect(createButtonStateExport.signatures).toEqual([
      {
        label: '(label: string) => ButtonProps',
        parameters: [
          {
            name: 'label',
            type: 'string',
            required: true,
            description: 'Visible button label.',
          },
        ],
        returnType: 'ButtonProps',
        returnDescription: 'A normalized button props object.',
      },
      {
        label: '(label: string, disabled: boolean) => ButtonProps',
        parameters: [
          {
            name: 'label',
            type: 'string',
            required: true,
            description: 'Visible button label.',
          },
          {
            name: 'disabled',
            type: 'boolean',
            required: true,
            description: 'Whether the button should be disabled.',
          },
        ],
        returnType: 'ButtonProps',
        returnDescription: 'A normalized button props object.',
      },
      {
        label: '(label: string, disabled?: boolean) => ButtonProps',
        parameters: [
          {
            name: 'label',
            type: 'string',
            required: true,
            description: 'Visible button label.',
          },
          {
            name: 'disabled',
            type: 'boolean',
            required: false,
            description: 'Whether the button should be disabled.',
          },
        ],
        returnType: 'ButtonProps',
        returnDescription: 'A normalized button props object.',
      },
    ]);

    const toolConfigExport = findExport(analysis, 'ToolConfig');
    expect(toolConfigExport.members).toEqual([
      {
        name: 'enabled',
        kind: 'property',
        type: 'boolean',
        required: true,
        description: null,
      },
    ]);

    const output = render(buildModel(analysis), { outputDir: 'paradox' });

    await expectSnapshot('basic.readme.md', output.readme);
    await expectSnapshot('basic.exports.md', output.exportsMarkdown);
    await expectSnapshot('basic.components.md', output.components);
    await expectSnapshot('basic.index.html', output.indexHtml);
    await expectSnapshot('basic.architecture-overview.mmd', output.diagrams[0]?.content ?? '');
    await expectSnapshot('basic.module-relationships.mmd', output.diagrams[1]?.content ?? '');
    await expectSnapshot('basic.export-graph.mmd', output.diagrams[2]?.content ?? '');
    await expectSnapshot('basic.entrypoint-sequence.mmd', output.diagrams[3]?.content ?? '');
  });

  test('renders multiple bin commands deterministically', async () => {
    const analysis = await analyze(
      {
        docs: {
          title: 'Multi Bin Fixture',
          description: 'Fixture docs for multiple binaries.',
        },
        package: {
          root: multiBinFixtureRoot,
          entrypoints: ['src/index.ts'],
        },
      },
      { packageRoot: multiBinFixtureRoot },
    );

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

    const output = render(buildModel(analysis), { outputDir: 'paradox' });

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

  expect(normalizeSnapshot(name, actual)).toBe(normalizeSnapshot(name, expected));
}

function normalizeSnapshot(name: string, value: string): string {
  const trimmed = value.trimEnd();

  if (name.endsWith('.html')) {
    return trimmed.replaceAll(/>\s+</g, '><').replaceAll(/\s+/g, ' ').trim();
  }

  return trimmed;
}

function findExport(
  analysis: Awaited<ReturnType<typeof analyze>>,
  name: string,
): (typeof analysis.exports)[number] {
  const item = analysis.exports.find((entry) => entry.name === name);
  expect(item).toBeDefined();
  if (!item) {
    throw new Error(`Expected export ${name} to exist.`);
  }

  return item;
}
