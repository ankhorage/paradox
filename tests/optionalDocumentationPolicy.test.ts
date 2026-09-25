import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { expect, test } from 'bun:test';

import { analyze } from '../src/analyze/analyze.js';
import { buildModel } from '../src/model/buildModel.js';
import { render } from '../src/render/render.js';

test('optional usage and config surfaces do not require fake documentation', async () => {
  const root = await createOptionalSurfaceFixtureAsync();

  try {
    const analysis = await analyze(
      { package: { entrypoints: ['src/index.ts'] } },
      { packageRoot: root },
    );
    const surfaceRuleIds = analysis.findings
      .map((finding) => finding.ruleId)
      .filter(
        (ruleId) =>
          ruleId.startsWith('documentation.usage.') || ruleId.startsWith('documentation.config.'),
      );

    expect(surfaceRuleIds).toEqual([]);
    const output = render(buildModel(analysis), { outputDir: 'paradox' });
    expect(output.readme).not.toContain('## Usage');
    expect(output.indexHtml).not.toContain('<h2>Usage</h2>');
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('usage opt-in still requires one README-promoted canonical example', async () => {
  const root = await createOptionalSurfaceFixtureAsync({
    'examples/advanced/index.ts': [
      '/***',
      ' * Advanced usage.',
      ' * @title Advanced Usage',
      ' * @usage',
      ' */',
      "export const advancedUsage = 'advanced';",
    ].join('\n'),
  });

  try {
    const analysis = await analyze(
      { package: { entrypoints: ['src/index.ts'] } },
      { packageRoot: root },
    );

    expect(hasFinding(analysis.findings, 'documentation.usage.readme.unique')).toBe(true);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('config-file opt-in still requires one canonical README config root', async () => {
  const root = await createOptionalSurfaceFixtureAsync({
    'src/types/config.ts': 'export interface OptionalConfig {}\n',
  });

  try {
    const analysis = await analyze(
      { package: { entrypoints: ['src/index.ts'] } },
      { packageRoot: root },
    );

    expect(hasFinding(analysis.findings, 'documentation.config.readme.unique')).toBe(true);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

/***
 * Creates a package with no documentation capabilities unless explicit files opt in.
 */
async function createOptionalSurfaceFixtureAsync(
  files: Readonly<Record<string, string>> = {},
): Promise<string> {
  const root = join(import.meta.dir, '.tmp', `optional-${Date.now()}-${Math.random()}`);
  await mkdir(join(root, 'src'), { recursive: true });
  await writeFixtureMetadataAsync(root);
  await writeFile(
    join(root, 'src', 'index.ts'),
    '/*** Documented public function. */\nexport function documented(): string { return "ok"; }\n',
  );
  await writeExtraFixtureFilesAsync(root, files);
  return root;
}

/***
 * Writes the minimal package and TypeScript metadata for an optional-surface fixture.
 */
async function writeFixtureMetadataAsync(root: string): Promise<void> {
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({
      name: '@fixture/optional-documentation',
      version: '1.0.0',
      description: 'Optional documentation fixture.',
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
}

/***
 * Writes optional opt-in source files while preserving requested relative paths.
 */
async function writeExtraFixtureFilesAsync(
  root: string,
  files: Readonly<Record<string, string>>,
): Promise<void> {
  for (const [path, source] of Object.entries(files)) {
    const target = join(root, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, source);
  }
}

/***
 * Checks whether one documentation finding exists by stable Policy rule id.
 */
function hasFinding(findings: readonly { readonly ruleId: string }[], ruleId: string): boolean {
  return findings.some((finding) => finding.ruleId === ruleId);
}
