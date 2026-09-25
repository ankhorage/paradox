import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test } from 'bun:test';

import { analyze } from '../src/analyze/analyze.js';
import type { AnalysisDocumentationFinding } from '../src/analyze/types.js';

test('packages without opted-in usage or config surfaces remain valid', async () => {
  const root = await createBareDocumentationFixtureAsync();

  try {
    const analysis = await analyze(
      { package: { entrypoints: ['src/index.ts'] } },
      { packageRoot: root },
    );

    expect(
      analysis.findings.some(
        (finding) =>
          finding.ruleId.startsWith('documentation.usage.') ||
          finding.ruleId.startsWith('documentation.config.'),
      ),
    ).toBe(false);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('usage opt-in still requires one README-promoted example', async () => {
  const root = await createBareDocumentationFixtureAsync();
  await mkdir(join(root, 'src', 'cli'), { recursive: true });
  await writeFile(
    join(root, 'src', 'cli', 'usage.ts'),
    ['/***', ' * CLI usage.', ' * @usage', ' */', "export const usage = 'cli';", ''].join('\n'),
  );

  try {
    const analysis = await analyze(
      { package: { entrypoints: ['src/index.ts'] } },
      { packageRoot: root },
    );
    expectFinding(analysis.findings, 'documentation.usage.readme.unique');
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('config-file opt-in still requires one canonical README root', async () => {
  const root = await createBareDocumentationFixtureAsync();
  await mkdir(join(root, 'src', 'types'), { recursive: true });
  await writeFile(join(root, 'src', 'types', 'config.ts'), 'export interface FixtureConfig {}\n');

  try {
    const analysis = await analyze(
      { package: { entrypoints: ['src/index.ts'] } },
      { packageRoot: root },
    );
    expectFinding(analysis.findings, 'documentation.config.readme.unique');
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

/*** Create a minimal package with neither optional documentation surface. */
async function createBareDocumentationFixtureAsync(): Promise<string> {
  const root = join(import.meta.dir, '.tmp', `bare-policy-${Date.now()}-${Math.random()}`);
  await mkdir(join(root, 'src'), { recursive: true });
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({
      name: '@fixture/optional-policy',
      version: '1.0.0',
      description: 'Optional documentation policy fixture.',
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
      include: ['src'],
    }),
  );
  await writeFile(
    join(root, 'src', 'index.ts'),
    '/*** Documented public function. */\nexport function documented(): string { return "ok"; }\n',
  );
  return root;
}

/*** Assert one optional-surface policy error. */
function expectFinding(findings: readonly AnalysisDocumentationFinding[], ruleId: string): void {
  expect(
    findings.some((finding) => finding.ruleId === ruleId && finding.severity === 'error'),
  ).toBe(true);
}
