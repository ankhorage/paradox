import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { expect, test } from 'bun:test';

import { analyze } from '../src/analyze/analyze.js';
import { collectDocumentationCommentsAsync } from '../src/analyze/documentation/collectDocumentationCommentsAsync.js';
import { validateDocumentationPolicyAsync } from '../src/analyze/documentation/validateDocumentationPolicyAsync.js';
import { createProject } from '../src/analyze/project.js';
import type { AnalysisDocumentationFinding } from '../src/analyze/types.js';

test('missing public function documentation produces warning status', async () => {
  const root = await createCanonicalFixtureAsync({
    publicSource: 'export function undocumented(): string { return "warning"; }',
  });

  try {
    const analysis = await analyze(
      { package: { entrypoints: ['src/index.ts'] } },
      { packageRoot: root },
    );

    expectFinding(analysis.findings, 'documentation.public-function.description', 'warning');
    expect(analysis.badges.find((badge) => badge.id === 'docs')).toEqual({
      id: 'docs',
      label: 'paradox',
      value: 'warnings',
      color: 'ca8a04',
    });
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('removed and unsupported Paradox tags produce invalid status', async () => {
  const root = await createCanonicalFixtureAsync({
    publicSource: [
      '/***',
      ' * Documented function.',
      ' * @example Removed tag',
      ' */',
      'export function invalidTag(): string { return "invalid"; }',
    ].join('\n'),
  });

  try {
    const analysis = await analyze(
      { package: { entrypoints: ['src/index.ts'] } },
      { packageRoot: root },
    );

    expectFinding(analysis.findings, 'documentation.comment.tag.unsupported', 'error');
    expect(analysis.badges.find((badge) => badge.id === 'docs')).toEqual({
      id: 'docs',
      label: 'paradox',
      value: 'invalid',
      color: 'dc2626',
    });
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('code blocks and usage outside canonical roots are errors', async () => {
  const root = await createCanonicalFixtureAsync({
    extraFiles: {
      'src/invalidUsage.ts': [
        '/***',
        ' * Invalid location.',
        ' * @usage',
        ' */',
        "export const invalidUsage = 'invalid';",
      ].join('\n'),
      'src/codeBlock.ts': [
        '/***',
        ' * Duplicated code is forbidden.',
        ' *',
        ' * ```ts',
        ' * const duplicated = true;',
        ' * ```',
        ' */',
        'export const documented = true;',
      ].join('\n'),
    },
  });

  try {
    const analysis = await analyze(
      { package: { entrypoints: ['src/index.ts'] } },
      { packageRoot: root },
    );

    expectFinding(analysis.findings, 'documentation.usage.location', 'error');
    expectFinding(analysis.findings, 'documentation.comment.code-block', 'error');
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('README-promoted usage requires exactly one title tag and prose', async () => {
  const root = await createCanonicalFixtureAsync({
    readmeUsage: [
      '/***',
      ' * @title First Title',
      ' * @title Duplicate Title',
      ' *',
      ' * @usage',
      ' * @readme',
      ' */',
      "export const basicUsage = 'invalid';",
    ].join('\n'),
  });

  try {
    const analysis = await analyze(
      { package: { entrypoints: ['src/index.ts'] } },
      { packageRoot: root },
    );

    expectFinding(analysis.findings, 'documentation.usage.readme.metadata', 'error');
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('@see distinguishes invalid values from unreachable public URLs', async () => {
  const root = await createCanonicalFixtureAsync({
    extraFiles: {
      'src/references.ts': [
        '/***',
        ' * External reference.',
        ' * @see http://docs.example.com/unsafe',
        ' * @see https://docs.example.com/missing',
        ' */',
        'export const references = true;',
      ].join('\n'),
    },
  });

  try {
    const project = createProject(root);
    const comments = await collectDocumentationCommentsAsync(root);
    const attempted: string[] = [];
    const findings = await validateDocumentationPolicyAsync({
      root,
      project,
      comments,
      exports: [],
      validateSeeUrlAsync: (url) => {
        attempted.push(url);
        return Promise.reject(new Error('not reachable'));
      },
    });

    expectFinding(findings, 'documentation.see.value', 'error');
    expectFinding(findings, 'documentation.see.reachable', 'error');
    expect(attempted).toEqual(['https://docs.example.com/missing']);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('@security requires one exact colocated executable test', async () => {
  const root = await createCanonicalFixtureAsync({
    extraFiles: {
      'src/security.ts': [
        '/***',
        ' * Security-sensitive behavior.',
        ' * @security security.test.ts#blocks unsafe target',
        ' */',
        'export const securitySensitive = true;',
      ].join('\n'),
      'src/security.test.ts': [
        "import { test } from 'bun:test';",
        '',
        "test('blocks unsafe target', () => {});",
      ].join('\n'),
    },
  });

  try {
    const analysis = await analyze(
      { package: { entrypoints: ['src/index.ts'] } },
      { packageRoot: root },
    );
    expect(
      analysis.findings.some((finding) => finding.ruleId === 'documentation.security.reference'),
    ).toBe(false);

    await writeFile(
      join(root, 'src', 'security.test.ts'),
      ["import { test } from 'bun:test';", '', "test('different test name', () => {});"].join(
        '\n',
      ),
    );
    const broken = await analyze(
      { package: { entrypoints: ['src/index.ts'] } },
      { packageRoot: root },
    );
    expectFinding(broken.findings, 'documentation.security.reference', 'error');
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

interface FixtureOptions {
  publicSource?: string;
  readmeUsage?: string;
  extraFiles?: Record<string, string>;
}

/***
 * Creates the minimal canonical documentation structure for policy tests.
 */
async function createCanonicalFixtureAsync(options: FixtureOptions = {}): Promise<string> {
  const root = join(import.meta.dir, '.tmp', `policy-${Date.now()}-${Math.random()}`);
  await mkdir(join(root, 'src', 'types'), { recursive: true });
  await mkdir(join(root, 'examples', 'basic-usage'), { recursive: true });
  await writeFixtureMetadataAsync(root);
  await writeConfigFixtureAsync(root);
  await writePublicFixtureAsync(root, options.publicSource);
  await writeUsageFixtureAsync(root, options.readmeUsage);
  await writeExtraFixtureFilesAsync(root, options.extraFiles ?? {});
  return root;
}

/***
 * Writes package and TypeScript metadata for one policy fixture.
 */
async function writeFixtureMetadataAsync(root: string): Promise<void> {
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({
      name: '@fixture/policy',
      version: '1.0.0',
      description: 'Policy fixture.',
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
 * Writes the canonical configuration schema used by policy fixtures.
 */
async function writeConfigFixtureAsync(root: string): Promise<void> {
  await writeFile(
    join(root, 'src', 'types', 'config.ts'),
    [
      '/***',
      ' * @title Configuration',
      ' *',
      ' * Configures the policy fixture.',
      ' *',
      ' * @config',
      ' * @readme',
      ' */',
      'export interface PolicyConfig {}',
      '',
    ].join('\n'),
  );
}

/***
 * Writes the configured public API fixture source.
 */
async function writePublicFixtureAsync(root: string, source?: string): Promise<void> {
  await writeFile(
    join(root, 'src', 'index.ts'),
    [
      source ??
        '/*** Documented public function. */\nexport function documented(): string { return "ok"; }',
      '',
      "export type { PolicyConfig } from './types/config.js';",
      '',
    ].join('\n'),
  );
}

/***
 * Writes the single README-promoted canonical usage example.
 */
async function writeUsageFixtureAsync(root: string, source?: string): Promise<void> {
  await writeFile(
    join(root, 'examples', 'basic-usage', 'index.ts'),
    source ??
      [
        '/***',
        ' * @title Basic Usage',
        ' *',
        ' * Demonstrates the policy fixture.',
        ' *',
        ' * @usage',
        ' * @readme',
        ' */',
        "export const basicUsage = 'policy';",
        '',
      ].join('\n'),
  );
}

/***
 * Writes optional policy-test source files while preserving their requested relative paths.
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
 * Asserts one exact policy finding without unsafe matcher widening.
 */
function expectFinding(
  findings: readonly AnalysisDocumentationFinding[],
  ruleId: string,
  severity: 'warning' | 'error',
): void {
  expect(
    findings.some((finding) => finding.ruleId === ruleId && finding.severity === severity),
  ).toBe(true);
}
