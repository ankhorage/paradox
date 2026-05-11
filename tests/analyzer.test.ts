import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

import { analyzeProject } from '../src/analyze/semantic/analyzeProject.js';

const fixtureRoot = join(import.meta.dir, 'fixtures/analyzer');

function findExport(result: ReturnType<typeof analyzeProject>, name: string) {
  const entry = result.exports.find((item) => item.name === name);
  if (!entry) {
    throw new Error(`Missing export ${name}`);
  }
  return entry;
}

describe('analyzer', () => {
  test('collects semantic exports and doc blocks', () => {
    const result = analyzeProject({ root: fixtureRoot, entrypoints: ['src/index.ts'] });

    const exportNames = result.exports.map((item) => item.name);
    for (const name of ['Card', 'Panel', 'Box', 'ToolConfig', 'helper', 'build']) {
      expect(exportNames).toContain(name);
    }
    expect(findExport(result, 'Card').kind).toBe('component');

    const cardDocBlock = findExport(result, 'Card').docBlock;
    expect(cardDocBlock?.description).toBe('Product-facing card container.');
    expect(cardDocBlock?.tags).toContainEqual({ name: 'readme', value: null });

    const narrative = result.docBlocks.find((block) =>
      block.description?.includes('Analyzer fixture narrative section.'),
    );
    expect(narrative?.tags).toContainEqual({ name: 'readme', value: null });

    expect(result.tags).toContainEqual({ name: 'readme', value: null });
    expect(result.tags).toContainEqual({ name: 'config', value: null });

    expect(findExport(result, 'build').signature).toBe('()');
  });

  test('extracts props from same-file, imported, and barrel types', () => {
    const result = analyzeProject({ root: fixtureRoot, entrypoints: ['src/index.ts'] });

    const cardProps = findExport(result, 'Card').props;
    expect(cardProps).toEqual({
      typeName: 'CardProps',
      sourcePath: 'src/components/Card.tsx',
      members: [
        {
          name: 'title',
          type: 'ReactNode | undefined',
          required: false,
          defaultValue: undefined,
          description: 'Optional card title.',
          inheritedFrom: undefined,
        },
        {
          name: 'compact',
          type: 'boolean | undefined',
          required: false,
          defaultValue: 'false',
          description: 'Uses denser spacing.',
          inheritedFrom: undefined,
        },
      ],
    });

    const panelProps = findExport(result, 'Panel').props;
    expect(panelProps).toEqual({
      typeName: 'PanelProps',
      sourcePath: 'src/components/PanelProps.ts',
      members: [
        {
          name: 'title',
          type: 'ReactNode',
          required: true,
          defaultValue: undefined,
          description: 'Panel title.',
          inheritedFrom: undefined,
        },
        {
          name: 'tone',
          type: "'info' | 'warning' | undefined",
          required: false,
          defaultValue: "'info'",
          description: 'Tone for the panel header.',
          inheritedFrom: undefined,
        },
      ],
    });

    const boxProps = findExport(result, 'Box').props;
    expect(boxProps).toEqual({
      typeName: 'BoxProps',
      sourcePath: 'src/components/BoxProps.ts',
      members: [
        {
          name: 'children',
          type: 'ReactNode',
          required: true,
          defaultValue: undefined,
          description: 'Box content.',
          inheritedFrom: undefined,
        },
      ],
    });
  });

  test('extracts config members, graphs, and composition edges', () => {
    const result = analyzeProject({ root: fixtureRoot, entrypoints: ['src/index.ts'] });

    const configMembers = findExport(result, 'ToolConfig').typeMembers ?? [];
    expect(configMembers).toEqual([
      {
        name: 'enabled',
        type: 'boolean',
        required: true,
        description: 'Enables the main feature.',
        inheritedFrom: undefined,
        children: undefined,
      },
      {
        name: 'logging',
        type: '{ debug?: boolean; }',
        required: true,
        description: 'Logging configuration.',
        inheritedFrom: undefined,
        children: [
          {
            name: 'debug',
            type: 'boolean | undefined',
            required: false,
            description: 'Enables debug output.',
            inheritedFrom: undefined,
            children: undefined,
          },
        ],
      },
    ]);

    expect(result.graphs.imports).toContainEqual({
      fromPath: 'src/index.ts',
      toPath: 'src/components/index.ts',
      sourcePath: 'src/index.ts',
    });

    expect(result.graphs.calls).toContainEqual({
      fromSymbol: 'build',
      toSymbol: 'helper',
      callExpression: 'helper',
      sourcePath: 'src/utils/calls.ts',
    });

    expect(result.graphs.componentComposition).toContainEqual({
      fromComponent: 'Card',
      toComponent: 'Heading',
      jsxElement: '<Heading>',
      sourcePath: 'src/components/Card.tsx',
    });
    expect(result.graphs.componentComposition).toContainEqual({
      fromComponent: 'Card',
      toComponent: 'Text',
      jsxElement: '<Text compact={compact} />',
      sourcePath: 'src/components/Card.tsx',
    });
  });
});
