import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

import { analyze } from '../src/analyze/analyze.js';
import { createUsageFromPackageJson } from '../src/analyze/usage.js';
import { buildModel } from '../src/model/buildModel.js';
import { render } from '../src/render/render.js';

const fixtureRoot = join(import.meta.dir, 'fixtures/basic');
const qualityMetadataFixtureRoot = join(import.meta.dir, 'fixtures/quality-metadata');
const declarationlessFixtureRoot = join(import.meta.dir, 'fixtures/declarationless');
const tagRegistryFixtureRoot = join(import.meta.dir, 'fixtures/tag-registry');

describe('analyze', () => {
  test('builds canonical documentation from package entrypoints and source-backed examples', async () => {
    const analysis = await analyze(
      {
        docs: {
          title: 'Fixture Docs',
          description: 'Generated fixture docs.',
        },
        package: {
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
    expect(analysis.usage).toEqual({
      packageName: '@fixture/basic',
      command: 'ankh basic --help',
    });
    expect(analysis.exampleCount).toBe(1);
    expect(analysis.usageEntries).toContainEqual({
      area: 'examples',
      title: 'Basic Usage',
      description: 'Demonstrates the canonical fixture usage.',
      language: 'ts',
      code: "export const basicUsage = 'fixture';",
      sourcePath: 'examples/basic-usage/index.ts',
      isReadme: true,
      see: [],
      security: [],
    });
    expect(analysis.findings).toEqual([]);
    expect(analysis.config).toMatchObject({
      exportName: 'ToolConfig',
      title: 'Configuration',
      description: 'Configuration for the fixture package.',
      isReadme: true,
    });

    const button = analysis.components[0];
    expect(button).toMatchObject({
      name: 'Button',
      description: 'Renders the fixture button component.',
      isReadme: true,
      modulePath: 'src/ui.ts',
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
    expect(createButtonStateExport.relatedSymbols).toEqual(['ButtonProps']);
    expect(createButtonStateExport.signatures).toEqual([
      {
        label: '(label: string) => ButtonProps',
        parameters: [
          {
            name: 'label',
            type: 'string',
            required: true,
            description: null,
          },
        ],
        returnType: 'ButtonProps',
        returnDescription: null,
      },
      {
        label: '(label: string, disabled: boolean) => ButtonProps',
        parameters: [
          {
            name: 'label',
            type: 'string',
            required: true,
            description: null,
          },
          {
            name: 'disabled',
            type: 'boolean',
            required: true,
            description: null,
          },
        ],
        returnType: 'ButtonProps',
        returnDescription: null,
      },
      {
        label: '(label: string, disabled?: boolean) => ButtonProps',
        parameters: [
          {
            name: 'label',
            type: 'string',
            required: true,
            description: null,
          },
          {
            name: 'disabled',
            type: 'boolean',
            required: false,
            description: null,
          },
        ],
        returnType: 'ButtonProps',
        returnDescription: null,
      },
    ]);

    const output = render(buildModel(analysis), { outputDir: 'paradox' });

    expectGeneratedReadmeScaffold(output.readme, 'Fixture Docs');
    expect(output.readme).toContain('## Usage');
    expect(output.readme).toContain('### CLI');
    expect(output.readme).toContain('ankh basic --help');
    expect(output.readme).toContain('### Basic Usage');
    expect(output.readme).toContain('## Configuration');
    expect(output.readme).toContain('Configuration for the fixture package.');
    expect(output.readme).toContain('## Public API');
    expect(output.readme).toContain('<summary>Button</summary>');
    expect(output.readme).not.toContain('@example');
    expect(output.readme).not.toContain('#### Basic button');
  });

  test('renders structured registry data independently from Paradox tag parsing', async () => {
    const analysis = await analyze(
      {
        docs: {
          title: 'Tag Registry Fixture',
        },
        package: {
          entrypoints: ['src/index.ts'],
        },
      },
      { packageRoot: tagRegistryFixtureRoot },
    );

    const registry = findExport(analysis, 'FIXTURE_DOC_TAGS');
    expect(registry.structuredRows).toEqual([
      {
        values: {
          name: 'readme',
          syntax: '@readme',
          description: 'Includes a symbol in README output.',
          appliesTo: 'symbol',
          repeatable: 'false',
          handler: 'markReadme',
        },
      },
      {
        values: {
          name: 'title',
          syntax: '@title',
          description: 'Sets an explicit presentation title.',
          appliesTo: 'symbol',
          repeatable: 'false',
          handler: 'setTitle',
        },
      },
    ]);

    const output = render(buildModel(analysis), { outputDir: 'paradox' });
    expect(output.readme).toContain(
      '| `title` | `@title` | Sets an explicit presentation title. | symbol | no | `setTitle` |',
    );
  });

  test('analyzes branded primitive exports without declarationless member crashes', async () => {
    const analysis = await analyze(
      {
        package: {
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

  test('derives the documentation badge from policy status', async () => {
    const analysis = await analyze(
      {
        docs: {
          title: 'Quality Metadata Fixture',
        },
        package: {
          entrypoints: ['src/index.ts'],
        },
      },
      { packageRoot: qualityMetadataFixtureRoot },
    );

    const docsBadge = analysis.badges.find((badge) => badge.id === 'docs');
    expect(analysis.findings).toEqual([]);
    expect(docsBadge).toEqual({
      id: 'docs',
      label: 'paradox',
      value: 'canonical',
      color: '0a7f3f',
    });

    const output = render(buildModel(analysis), { outputDir: 'paradox' });
    expect(output.readme).toContain('![paradox: canonical](./paradox/badges/docs.svg)');
  });

  test('normalizes every package to its canonical Ankh help command', () => {
    expect(createUsageFromPackageJson({ name: 'fixture-package' })).toEqual({
      packageName: 'fixture-package',
      command: 'ankh fixture-package --help',
    });
    expect(createUsageFromPackageJson({ name: '@fixture/scoped-package' })).toEqual({
      packageName: '@fixture/scoped-package',
      command: 'ankh scoped-package --help',
    });
  });
});

/***
 * Checks the stable generated README scaffold shared by package fixtures.
 */
function expectGeneratedReadmeScaffold(readme: string, title: string): void {
  expect(readme).toContain('<!-- markdownlint-disable MD013 MD033 -->');
  expect(readme).toContain('<!-- This file is generated by Paradox. Do not edit manually. -->');
  expect(readme).toContain(`# ${title}`);
  expect(readme).toContain('## Generated documentation');
  expect(readme).toContain('[Architecture overview](./paradox/diagrams/architecture-overview.mmd)');
}

/***
 * Finds one analyzed public export by name.
 */
function findExport(
  analysis: Awaited<ReturnType<typeof analyze>>,
  name: string,
): (typeof analysis.exports)[number] {
  const item = analysis.exports.find((entry) => entry.name === name);
  expect(item).toBeDefined();
  if (item === undefined) throw new Error(`Expected export ${name} to exist.`);
  return item;
}
