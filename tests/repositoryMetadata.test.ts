import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test } from 'bun:test';

import { analyze } from '../src/analyze/analyze.js';
import { readRepositoryMetadataAsync } from '../src/features/repositoryMetadata/adapters/readRepositoryMetadataAsync.js';
import { buildModel } from '../src/model/buildModel.js';
import { render } from '../src/render/render.js';

const basicFixtureRoot = join(import.meta.dir, 'fixtures/basic');

test('uses valid source metadata before legacy descriptions and keeps Usage near the top', async () => {
  const root = await copyBasicFixtureAsync();

  try {
    await mkdir(join(root, 'src', 'metadata'), { recursive: true });
    await writeMetadataAsync(join(root, 'src', 'metadata', 'repository.json'), {
      schemaVersion: 1,
      kind: 'library',
      title: 'Metadata Fixture',
      summary: 'Authored repository summary.',
      purpose: 'Authored repository purpose.',
      responsibilities: ['Provide fixture behavior.'],
      boundaries: ['Does not own deployment.'],
      audience: ['Fixture consumers.'],
      useCases: ['Generate fixture documentation.'],
    });

    const analysis = await analyze(
      {
        docs: { description: 'Legacy configured description.' },
        package: { entrypoints: ['src/index.ts'] },
      },
      { packageRoot: root },
    );
    const explicitlyTitled = await analyze(
      {
        docs: { title: 'Explicit Docs Title' },
        package: { entrypoints: ['src/index.ts'] },
      },
      { packageRoot: root },
    );
    const output = render(buildModel(analysis), { outputDir: 'docs' });

    expect(analysis.packageName).toBe('Metadata Fixture');
    expect(explicitlyTitled.packageName).toBe('Explicit Docs Title');
    expect(analysis.description).toBe('Authored repository summary.');
    expect(analysis.purpose).toBe('Authored repository purpose.');
    expect(output.readme).toContain('# Metadata Fixture');
    expect(output.readme).not.toContain('Legacy configured description.');
    expect(output.indexHtml).toContain('Authored repository summary.');
    expect(output.indexHtml).toContain('Authored repository purpose.');

    const usage = output.readme.indexOf('## Usage');
    expect(usage).toBeGreaterThan(output.readme.indexOf('Authored repository purpose.'));
    expect(usage).toBeLessThan(output.readme.indexOf('## Configuration'));
    expect(usage).toBeLessThan(output.readme.indexOf('## Documentation'));
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('preserves config then package description fallbacks when metadata is absent', async () => {
  const configured = await analyze(
    {
      docs: { description: 'Configured fallback.' },
      package: { entrypoints: ['src/index.ts'] },
    },
    { packageRoot: basicFixtureRoot },
  );
  const packaged = await analyze(
    { package: { entrypoints: ['src/index.ts'] } },
    { packageRoot: basicFixtureRoot },
  );

  expect(configured.description).toBe('Configured fallback.');
  expect(configured.purpose).toBeUndefined();
  expect(packaged.description).toBe('Fixture package for Paradox tests.');
  expect(packaged.purpose).toBeUndefined();
  const output = render(buildModel(configured));
  expect(output.paradoxJson).not.toContain('"purpose":');

  const usage = output.readme.indexOf('## Usage');
  expect(usage).toBeGreaterThan(output.readme.indexOf('Configured fallback.'));
  expect(usage).toBeLessThan(output.readme.indexOf('## Configuration'));
  expect(usage).toBeLessThan(output.readme.indexOf('## Documentation'));
});

test('reads the published non-source profile without inventing a source directory', async () => {
  const root = temporaryRoot('non-source');

  try {
    await mkdir(join(root, 'metadata'), { recursive: true });
    await writeMetadataAsync(join(root, 'metadata', 'repository.json'), {
      schemaVersion: 1,
      kind: 'infrastructure',
      title: 'Infrastructure Fixture',
      summary: 'Defines fixture infrastructure.',
      purpose: 'Keep infrastructure declarations inspectable.',
    });

    const metadata = await readRepositoryMetadataAsync(root);
    expect(metadata).toMatchObject({
      kind: 'infrastructure',
      title: 'Infrastructure Fixture',
    });
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('reports malformed and policy-invalid present metadata', async () => {
  const malformedRoot = temporaryRoot('malformed');
  const placeholderRoot = temporaryRoot('placeholder');

  try {
    await Promise.all([
      mkdir(join(malformedRoot, 'src', 'metadata'), { recursive: true }),
      mkdir(join(placeholderRoot, 'src', 'metadata'), { recursive: true }),
    ]);
    await writeMetadataAsync(join(malformedRoot, 'src', 'metadata', 'repository.json'), {
      schemaVersion: 1,
      kind: 'library',
      title: 'Malformed Fixture',
      summary: 'Has no purpose.',
    });
    await writeMetadataAsync(join(placeholderRoot, 'src', 'metadata', 'repository.json'), {
      schemaVersion: 1,
      kind: 'library',
      title: 'Placeholder Fixture',
      summary: 'TBD',
      purpose: 'Exercise published policy.',
    });

    await expectRejectionAsync(
      readRepositoryMetadataAsync(malformedRoot),
      'Unable to use repository metadata at src/metadata/repository.json: Invalid repository metadata: #/purpose must be a string.',
    );
    await expectRejectionAsync(
      readRepositoryMetadataAsync(placeholderRoot),
      'repository.metadata.text.meaningful',
    );
  } finally {
    await Promise.all([
      rm(malformedRoot, { force: true, recursive: true }),
      rm(placeholderRoot, { force: true, recursive: true }),
    ]);
  }
});

/*** Expects one promise to reject with an actionable metadata diagnostic. */
async function expectRejectionAsync(promise: Promise<unknown>, message: string): Promise<void> {
  try {
    await promise;
    throw new Error('Expected repository metadata to be rejected.');
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect(error instanceof Error ? error.message : String(error)).toContain(message);
  }
}

/*** Copies the representative source package into an isolated test root. */
async function copyBasicFixtureAsync(): Promise<string> {
  const root = temporaryRoot('source');
  await cp(basicFixtureRoot, root, { recursive: true });
  return root;
}

/*** Writes one JSON-compatible metadata document deterministically. */
async function writeMetadataAsync(
  path: string,
  document: Readonly<Record<string, unknown>>,
): Promise<void> {
  await writeFile(path, `${JSON.stringify(document, null, 2)}\n`);
}

/*** Creates a collision-resistant local test path. */
function temporaryRoot(kind: string): string {
  return join(import.meta.dir, '.tmp', `repository-metadata-${kind}-${crypto.randomUUID()}`);
}
