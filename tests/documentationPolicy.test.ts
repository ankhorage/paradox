import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test } from 'bun:test';

import { analyze } from '../src/analyze/analyze.js';
import { collectDocumentationCommentsAsync } from '../src/analyze/documentation/collectDocumentationCommentsAsync.js';
import { validateDocumentationPolicyAsync } from '../src/analyze/documentation/validateDocumentationPolicyAsync.js';
import { createProject } from '../src/analyze/project.js';

test('missing public function documentation produces warning status', async () => {
  const root = await createCanonicalFixtureAsync({
    publicSource: 'export function undocumented(): string { return "warning"; }',
  });

  try {
    const analysis = await analyze(
      { package: { entrypoints: ['src/index.ts'] } },
      { packageRoot: root },
    );

    expect(analysis.findings).toContainEqual(
      expect.objectContaining({
        ruleId: 'documentation.public-function.description',
        severity: 'warning',
      }),
    );
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

    expect(analysis.findings).toContainEqual(
      expect.objectContaining({
        ruleId: 'documentation.comment.tag.unsupported',
        severity: 'error',
      }),
    );
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
    const ids = analysis.findings.map((finding) => finding.ruleId);

    expect(ids).toContain('documentation.usage.location');
    expect(ids).toContain('documentation.comment.code-block');
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

    expect(analysis.findings).toContainEqual(
      expect.objectContaining({
        ruleId: 'documentation.usage.readme.metadata',
        severity: 'error',
      }),
    );
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

    expect(findings).toContainEqual(
      expect.objectContaining({ ruleId: 'documentation.see.value' }),
    );
    expect(findings).toContainEqual(
      expect.objectContaining({ ruleId: 'documentation.see.reachable' }),
    );
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
      analysis.findings.some(
        (finding) => finding.ruleId === 'documentation.security.reference',
      ),
    ).toBe(false);

    await writeFile(
      join(root, 'src', 'security.test.ts'),
      [
        "import { test } from 'bun:test';",
        '',
        "test('different test name', () => {});",
      ].join('\n'),
    );
    const broken = await analyze(
      { package: { entrypoints: ['src/index.ts'] } },
      { packageRoot: root },
    );
    expect(broken.findings).toContainEqual(
      expect.objectContaining({
        ruleId: 'documentation.security.reference',
        severity: 'error',
      }),
    );
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
  await writeFile(
    join(root, 'src', 'index.ts'),
    [
      options.publicSource ??
        '/*** Documented public function. */\nexport function documented(): string { return "ok"; }',
      '',
      "export type { PolicyConfig } from './types/config.js';",
      '',
    ].join('\n'),
  );
  await writeFile(
    join(root, 'examples', 'basic-usage', 'index.ts'),
    options.readmeUsage ??
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

  for (const [path, source] of Object.entries(options.extraFiles ?? {})) {
    const target = join(root, path);
    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, source);
  }

  return root;
}
