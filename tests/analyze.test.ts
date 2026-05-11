import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

import { analyze } from '../src/analyze/analyze.js';
import { createUsageFromPackageJson } from '../src/analyze/usage.js';
import { buildModel } from '../src/model/buildModel.js';
import { render } from '../src/render/render.js';

const fixtureRoot = join(import.meta.dir, 'fixtures/basic');
const multiBinFixtureRoot = join(import.meta.dir, 'fixtures/multi-bin');
const qualityMetadataFixtureRoot = join(import.meta.dir, 'fixtures/quality-metadata');
const declarationlessFixtureRoot = join(import.meta.dir, 'fixtures/declarationless');
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
      isReadme: true,
      members: [
        {
          name: 'enabled',
          type: 'boolean',
          required: true,
          description: null,
        },
      ],
    });

    expect(analysis.components).toHaveLength(1);
    const [button] = analysis.components;
    expect(button).toMatchObject({
      name: 'Button',
      description: 'Renders the fixture button component.',
      isReadme: true,
      examples: [
        {
          title: 'Basic button',
          language: 'tsx',
          code: '<Button label="Save" />',
        },
      ],
      modulePath: 'src/ui.ts',
      sourceLocation: {
        filePath: 'src/ui.ts',
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
    });

    const createButtonStateExport = findExport(analysis, 'createButtonState');
    expect(createButtonStateExport.modulePath).toBe('src/ui.ts');
    expect(createButtonStateExport.exportPaths).toEqual(['src/index.ts']);
    expect(createButtonStateExport.relatedSymbols).toEqual(['ButtonProps']);
    expect(createButtonStateExport.sourceLocation.filePath).toBe('src/ui.ts');
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
    expect(toolConfigExport.isReadme).toBe(true);
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

    expectGeneratedReadmeScaffold(output.readme, 'Fixture Docs');
    expect(output.readme).toContain('## Configuration');
    expect(output.readme).toContain('<summary>Configuration options</summary>');
    expect(output.readme).toContain('## Public API');
    expect(output.readme).toContain('### Utilities');
    expect(output.readme).toContain('<summary>Button</summary>');
    expect(output.readme).toContain('<summary>Props</summary>');
    expect(output.readme).toContain('#### Basic button');
    expect(output.readme).toContain('<Button label="Save" />');

    expect(output.exportsMarkdown).toContain('# Public API');
    expect(output.exportsMarkdown).toContain('## Button');
    expect(output.components).toContain('# Components');
    expect(output.components).toContain('| Prop | Type | Required | Default | Description |');
    expect(output.indexHtml).toContain('Fixture Docs');
    await expectSnapshot('basic.architecture-overview.mmd', output.diagrams[0]?.content ?? '');
    await expectSnapshot('basic.module-relationships.mmd', output.diagrams[1]?.content ?? '');
    await expectSnapshot('basic.export-graph.mmd', output.diagrams[2]?.content ?? '');
    await expectSnapshot('basic.entrypoint-sequence.mmd', output.diagrams[3]?.content ?? '');
  });

  test('analyzes branded primitive exports without declarationless member crashes', async () => {
    const analysis = await analyze(
      {
        docs: {
          title: 'Declarationless Fixture',
          description: 'Fixture docs for declarationless type members.',
        },
        package: {
          root: declarationlessFixtureRoot,
          entrypoints: ['src/index.ts'],
        },
      },
      { packageRoot: declarationlessFixtureRoot },
    );

    expect(analysis.exports.map((item) => item.name).sort()).toEqual([
      'DeclaredOptions',
      'HexColor',
      'parseHexColor',
    ]);
    expect(findExport(analysis, 'HexColor').members).toEqual([]);
    expect(findExport(analysis, 'DeclaredOptions').members).toEqual([
      {
        name: 'enabled',
        kind: 'property',
        type: 'boolean',
        required: true,
        description: null,
      },
    ]);
    expect(findExport(analysis, 'parseHexColor').description).toBe('Parses a hex color value.');
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

    expectGeneratedReadmeScaffold(output.readme, 'Multi Bin Fixture');
    expect(output.readme).toContain('bunx fixture-multi-bin alpha');
    expect(output.readme).toContain('bunx fixture-multi-bin beta');
    expect(output.readme).not.toContain('## Public API');
  });

  test('computes repository quality badges deterministically', async () => {
    const analysis = await analyze(
      {
        docs: {
          title: 'Quality Metadata Fixture',
          description: 'Fixture docs for repository metadata badges.',
        },
        package: {
          root: qualityMetadataFixtureRoot,
          entrypoints: ['src/index.ts'],
        },
      },
      { packageRoot: qualityMetadataFixtureRoot },
    );

    const model = buildModel(analysis);
    expect(model.badges).toEqual([
      {
        id: 'license',
        label: 'license',
        value: 'MIT',
        color: '2563eb',
      },
      {
        id: 'npm',
        label: 'npm',
        value: 'v1.2.3',
        color: 'cb3837',
      },
      {
        id: 'runtime',
        label: 'runtime',
        value: 'bun',
        color: 'f59e0b',
      },
      {
        id: 'typescript',
        label: 'typescript',
        value: 'strict',
        color: '2563eb',
      },
      {
        id: 'eslint',
        label: 'eslint',
        value: 'checked',
        color: '0a7f3f',
      },
      {
        id: 'prettier',
        label: 'prettier',
        value: 'checked',
        color: '0a7f3f',
      },
      {
        id: 'build',
        label: 'build',
        value: 'checked',
        color: '0a7f3f',
      },
      {
        id: 'tests',
        label: 'tests',
        value: 'checked',
        color: '0a7f3f',
      },
      {
        id: 'coverage',
        label: 'coverage',
        value: '98.4%',
        color: '0a7f3f',
      },
      {
        id: 'docs',
        label: 'docs',
        value: 'paradox',
        color: '0f766e',
      },
    ]);

    const output = render(model, { outputDir: 'paradox' });

    expect(output.badges.map((badge) => badge.path)).toEqual([
      'badges/license.svg',
      'badges/npm.svg',
      'badges/runtime.svg',
      'badges/typescript.svg',
      'badges/eslint.svg',
      'badges/prettier.svg',
      'badges/build.svg',
      'badges/tests.svg',
      'badges/coverage.svg',
      'badges/docs.svg',
    ]);

    expectGeneratedReadmeScaffold(output.readme, 'Quality Metadata Fixture');
    expect(output.readme).toContain('![coverage: 98.4%](./paradox/badges/coverage.svg)');
    expect(output.readme).not.toContain('## Public API');
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

function expectGeneratedReadmeScaffold(readme: string, title: string): void {
  expect(readme).toContain('<!-- markdownlint-disable MD013 MD033 -->');
  expect(readme).toContain('<!-- This file is generated by Paradox. Do not edit manually. -->');
  expect(readme).toContain(`# ${title}`);
  expect(readme).toContain('## Documentation Tags');
  expect(readme).toContain('<summary>@readme</summary>');
  expect(readme).toContain('<summary>@config</summary>');
  expect(readme).toContain('<summary>@example</summary>');
  expect(readme).toContain('<summary>Architecture overview</summary>');
}

function normalizeSnapshot(name: string, value: string): string {
  const trimmed = value.trimEnd();

  if (name.endsWith('.html')) {
    return normalizeHtmlSnapshot(trimmed);
  }

  return trimmed;
}

function normalizeHtmlSnapshot(value: string): string {
  return value
    .replaceAll('"', "'")
    .replaceAll(
      /<p>\s*<strong>Related symbols:<\/strong>\s*(.*?)\s*<\/p>/gs,
      '<div><strong>Related symbols:</strong>$1</div>',
    )
    .replaceAll(/<pre>\s+/g, '<pre>')
    .replaceAll(/\s+<\/pre\s*>/g, '</pre>')
    .replaceAll(/\s+>/g, '>')
    .replaceAll(/>\s+</g, '><')
    .replaceAll(/\s+/g, ' ')
    .replaceAll(/\s+<\/p>/g, '</p>')
    .trim();
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
