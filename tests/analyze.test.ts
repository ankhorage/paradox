import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

import { analyze, buildModel, render } from '../src/index.js';

const fixtureRoot = join(import.meta.dir, 'fixtures/basic');
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

    expect(analysis.exports.map((item) => item.name)).toEqual(['Button', 'ButtonProps']);
    expect(analysis.exports.map((item) => item.name)).not.toContain('internalHelper');

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
});

async function expectSnapshot(name: string, actual: string): Promise<void> {
  const expected = await readFile(join(snapshotRoot, name), 'utf-8');

  expect(actual.trimEnd()).toBe(expected.trimEnd());
}
