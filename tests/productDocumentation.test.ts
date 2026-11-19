import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test } from 'bun:test';

import { analyze } from '../src/analyze/analyze.js';
import { buildModel } from '../src/model/buildModel.js';
import { render } from '../src/render/render.js';
import { write } from '../src/write/write.js';

const basicFixtureRoot = join(import.meta.dir, 'fixtures/basic');

test('renders generic website sections in README and technical documentation', async () => {
  const root = await createProductFixtureAsync();

  try {
    const output = await renderProductDocumentationAsync(root);

    expect(output.readme).toContain('## Overview');
    expect(output.readme).toContain('Four distinct worlds for private clients.');
    expect(output.readme).toContain('### Worlds');
    expect(output.readme).toContain('#### Portfolio');
    expect(output.readme).toContain('### Commerce boundaries');
    expect(output.readme).toContain('#### Approval required');
    expect(output.indexHtml).toContain('<h2>Product overview</h2>');
    expect(output.indexHtml).toContain('Portfolio');
    expect(output.paradoxJson).toContain('"productDocumentation"');
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('keeps package README output unchanged when product documentation is not configured', async () => {
  const analysis = await analyze(
    { package: { entrypoints: ['src/index.ts'] } },
    { packageRoot: basicFixtureRoot },
  );
  const output = render(buildModel(analysis));

  expect(analysis.productDocumentation).toBeNull();
  expect(output.readme).not.toContain('## Overview');
  expect(output.paradoxJson).toContain('"productDocumentation": null');
});

test('rejects invalid or mismatched product sources', async () => {
  const root = await createProductFixtureAsync();

  try {
    await writeProductSourceAsync(root, { schemaVersion: 1, kind: 'website', sections: [] });
    await expectProductSourceRejectedAsync(
      root,
      productConfig,
      'Invalid product documentation: #/overview must be a non-empty string.',
    );

    await writeProductSourceAsync(root, validProductDocumentation('application'));
    await expectProductSourceRejectedAsync(
      root,
      productConfig,
      'kind "application" does not match repository metadata kind "website"',
    );

    await expectProductSourceRejectedAsync(
      root,
      { docs: { productSource: '../outside.json' } },
      'Product documentation source must stay inside the package root.',
    );
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('identifies generated README drift after a canonical source changes', async () => {
  const root = await createProductFixtureAsync();

  try {
    const initial = await renderProductDocumentationAsync(root);
    await write(
      initial,
      { ...productConfig, mode: 'write', collaborators: false, donation: false },
      {
        packageRoot: root,
        outputRoot: join(root, 'paradox'),
      },
    );
    const generatedReadme = await readFile(join(root, 'README.md'), 'utf8');
    expect(generatedReadme).toBe(initial.readme);

    await writeProductSourceAsync(root, {
      ...validProductDocumentation('website'),
      overview: 'An updated source-owned overview.',
    });
    const changed = await renderProductDocumentationAsync(root);

    expect(changed.readme).toContain('An updated source-owned overview.');
    expect(generatedReadme).not.toBe(changed.readme);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

const productConfig = {
  docs: { productSource: 'src/metadata/product-documentation.json' },
  package: { entrypoints: ['src/index.ts'] },
} as const;

/*** Creates an isolated website fixture with canonical repository and product sources. */
async function createProductFixtureAsync(): Promise<string> {
  const root = join(import.meta.dir, '.tmp', `product-documentation-${crypto.randomUUID()}`);
  await cp(basicFixtureRoot, root, { recursive: true });
  await mkdir(join(root, 'src', 'metadata'), { recursive: true });
  await writeFile(
    join(root, 'src', 'metadata', 'repository.json'),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        kind: 'website',
        title: 'Website Fixture',
        summary: 'A source-backed website fixture.',
        purpose: 'Prove product documentation rendering.',
      },
      null,
      2,
    )}\n`,
  );
  await writeProductSourceAsync(root, validProductDocumentation('website'));
  return root;
}

/*** Analyzes and renders one fixture using the canonical product source. */
async function renderProductDocumentationAsync(root: string) {
  return render(buildModel(await analyze(productConfig, { packageRoot: root })));
}

/*** Expects product-source analysis to fail with the supplied actionable diagnostic. */
async function expectProductSourceRejectedAsync(
  root: string,
  config: Parameters<typeof analyze>[0],
  message: string,
): Promise<void> {
  try {
    await analyze(config, { packageRoot: root });
    throw new Error('Expected product documentation source to be rejected.');
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect(error instanceof Error ? error.message : String(error)).toContain(message);
  }
}

/*** Writes one product source document under the canonical fixture metadata directory. */
async function writeProductSourceAsync(root: string, document: unknown): Promise<void> {
  await writeFile(
    join(root, 'src', 'metadata', 'product-documentation.json'),
    `${JSON.stringify(document, null, 2)}\n`,
  );
}

/*** Returns generic application or website documentation without consumer-specific fields. */
function validProductDocumentation(kind: 'application' | 'website') {
  return {
    schemaVersion: 1,
    kind,
    overview: 'Four distinct worlds for private clients.',
    sections: [
      {
        title: 'Worlds',
        entries: [
          { title: 'Portfolio', description: 'Presents the authored portfolio.' },
          { title: 'Journal', description: 'Publishes editorial stories.' },
        ],
      },
      {
        title: 'Commerce boundaries',
        entries: [
          {
            title: 'Approval required',
            description: 'No commerce integration is enabled without approval.',
          },
        ],
      },
    ],
  };
}
