import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test } from 'bun:test';

import { analyze } from '../src/analyze/analyze.js';
import { buildModel } from '../src/model/buildModel.js';
import { render } from '../src/render/render.js';
import type { ParadoxConfig } from '../src/types/config.js';
import { write } from '../src/write/write.js';

test('enables contributors by default', async () => {
  const root = await createFixtureAsync();
  try {
    const { analysis, model, result } = await renderFixtureAsync(root);
    expect(analysis.collaborators).toBeTrue();
    expect(model.collaborators).toBeTrue();
    assertContributorsWorkflow(result.collaboratorsWorkflowYaml);
    expect(result.readme).not.toContain('## Contributors');
    expect(result.readme).toContain('<!-- readme: contributors -start -->');
    expect(result.indexHtml).not.toContain('<h2>Contributors</h2>');
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('disables contributors with explicit false', async () => {
  const root = await createFixtureAsync();
  try {
    const { analysis, result } = await renderFixtureAsync(root, { collaborators: false });
    expect(analysis.collaborators).toBeNull();
    expect(result.collaboratorsWorkflowYaml).toBeNull();
    expect(result.readme).not.toContain('## Contributors');
    expect(result.readme).not.toContain('<!-- readme: contributors -start -->');
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('renders the canonical contributors chapter and workflow', async () => {
  const root = await createFixtureAsync();
  try {
    const { analysis, model, result } = await renderFixtureAsync(root, {
      collaborators: true,
    });
    expect(analysis.collaborators).toBeTrue();
    expect(model.collaborators).toBeTrue();
    expect(result.readme).toContain(
      [
        '<!-- readme: contributors -start -->',
        '<!-- readme: contributors -end -->',
        '',
      ].join('\n'),
    );
    assertContributorsWorkflow(result.collaboratorsWorkflowYaml);
    expect(result.indexHtml).not.toContain('<h2>Collaborators</h2>');
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('renders contributors before donation when both features are enabled', async () => {
  const root = await createFixtureAsync();
  try {
    const { result } = await renderFixtureAsync(root, {
      collaborators: true,
      donation: true,
    });
    const collaboratorsIndex = result.readme.indexOf('<!-- readme: contributors -start -->');
    const donationIndex = result.readme.indexOf('## Donation');
    expect(collaboratorsIndex).toBeGreaterThan(-1);
    expect(donationIndex).toBeGreaterThan(collaboratorsIndex);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('does not create or remove the collaborators workflow in safe mode', async () => {
  const root = await createFixtureAsync();
  const workflowPath = join(root, '.github', 'workflows', 'collaborators.yml');
  try {
    const enabled = await renderFixtureAsync(root, {
      collaborators: true,
      mode: 'safe',
    });
    await write(enabled.result, enabled.config, {
      packageRoot: root,
      outputRoot: join(root, 'paradox'),
    });
    expect(readFile(workflowPath, 'utf-8')).rejects.toThrow();

    await mkdir(join(root, '.github', 'workflows'), { recursive: true });
    await writeFile(workflowPath, enabled.result.collaboratorsWorkflowYaml ?? '');
    const disabled = await renderFixtureAsync(root, { mode: 'safe', collaborators: false });
    await write(disabled.result, disabled.config, {
      packageRoot: root,
      outputRoot: join(root, 'paradox'),
    });
    expect(await readFile(workflowPath, 'utf-8')).toBe(expectedWorkflow);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('writes the collaborators workflow idempotently in write mode', async () => {
  const root = await createFixtureAsync();
  const workflowPath = join(root, '.github', 'workflows', 'collaborators.yml');
  try {
    const enabled = await renderFixtureAsync(root, { collaborators: true });
    await write(enabled.result, enabled.config, {
      packageRoot: root,
      outputRoot: join(root, 'paradox'),
    });
    const firstReadme = await readFile(join(root, 'README.md'), 'utf-8');
    const firstWorkflow = await readFile(workflowPath, 'utf-8');

    await write(enabled.result, enabled.config, {
      packageRoot: root,
      outputRoot: join(root, 'paradox'),
    });
    expect(await readFile(join(root, 'README.md'), 'utf-8')).toBe(firstReadme);
    expect(await readFile(workflowPath, 'utf-8')).toBe(firstWorkflow);
    expect(firstWorkflow).toBe(enabled.result.collaboratorsWorkflowYaml);

  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('recognizes CRLF Paradox workflows during rerun and disable', async () => {
  const root = await createFixtureAsync();
  const workflowPath = join(root, '.github', 'workflows', 'collaborators.yml');
  const expectedWorkflow = (await renderFixtureAsync(root, { collaborators: true })).result.collaboratorsWorkflowYaml ?? '';
  const crlfWorkflow = expectedWorkflow.replaceAll('\n', '\r\n');
  try {
    await mkdir(join(root, '.github', 'workflows'), { recursive: true });
    await writeFile(workflowPath, crlfWorkflow);
    const enabled = await renderFixtureAsync(root, { collaborators: true });
    await write(enabled.result, enabled.config, {
      packageRoot: root,
      outputRoot: join(root, 'paradox'),
    });
    expect(await readFile(workflowPath, 'utf-8')).toBe(expectedWorkflow);

    await writeFile(workflowPath, crlfWorkflow);
    const disabled = await renderFixtureAsync(root, { collaborators: false });
    await write(disabled.result, disabled.config, {
      packageRoot: root,
      outputRoot: join(root, 'paradox'),
    });
    expect(readFile(workflowPath, 'utf-8')).rejects.toThrow();
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('refuses to overwrite a user-owned collaborators workflow', async () => {
  const root = await createFixtureAsync();
  const workflowPath = join(root, '.github', 'workflows', 'collaborators.yml');
  try {
    await mkdir(join(root, '.github', 'workflows'), { recursive: true });
    await writeFile(workflowPath, 'name: User workflow\n');
    await writeFile(join(root, 'README.md'), '# Original README\n');
    const enabled = await renderFixtureAsync(root, { collaborators: true });
    expect(
      write(enabled.result, enabled.config, {
        packageRoot: root,
        outputRoot: join(root, 'paradox'),
      }),
    ).rejects.toThrow('Refusing to overwrite existing non-Paradox');
    expect(await readFile(workflowPath, 'utf-8')).toBe('name: User workflow\n');
    expect(await readFile(join(root, 'README.md'), 'utf-8')).toBe('# Original README\n');
    expect(readFile(join(root, 'paradox', 'paradox.json'), 'utf-8')).rejects.toThrow();
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('removes a Paradox-owned collaborators workflow when disabled', async () => {
  const root = await createFixtureAsync();
  const workflowPath = join(root, '.github', 'workflows', 'collaborators.yml');
  try {
    const enabled = await renderFixtureAsync(root, { collaborators: true });
    await write(enabled.result, enabled.config, {
      packageRoot: root,
      outputRoot: join(root, 'paradox'),
    });
    const disabled = await renderFixtureAsync(root, { collaborators: false });
    await write(disabled.result, disabled.config, {
      packageRoot: root,
      outputRoot: join(root, 'paradox'),
    });
    expect(readFile(workflowPath, 'utf-8')).rejects.toThrow();
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('preserves a user-owned collaborators workflow when disabled', async () => {
  const root = await createFixtureAsync();
  const workflowPath = join(root, '.github', 'workflows', 'collaborators.yml');
  try {
    await mkdir(join(root, '.github', 'workflows'), { recursive: true });
    await writeFile(workflowPath, 'name: User workflow\n');
    const disabled = await renderFixtureAsync(root, { collaborators: false });
    await write(disabled.result, disabled.config, {
      packageRoot: root,
      outputRoot: join(root, 'paradox'),
    });
    expect(await readFile(workflowPath, 'utf-8')).toBe('name: User workflow\n');
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

interface FixtureOptions {
  collaborators?: boolean;
  donation?: true;
  mode?: 'safe' | 'write';
}

function assertContributorsWorkflow(workflow: string | null): void {
  expect(workflow).not.toBeNull();
  expect(workflow).toContain('name: Update contributors');
  expect(workflow).toContain('https://api.github.com/repos/');
  expect(workflow).toContain('Generated by Paradox contributor avatars');
  expect(workflow).toContain('## Contributors');
  expect(workflow).toContain('gh pr create');
  expect(workflow).not.toContain('contributors-readme-action');
}

function createConfig(options: FixtureOptions = {}): ParadoxConfig {
  return {
    mode: options.mode ?? 'write',
    ...(options.collaborators === undefined ? {} : { collaborators: options.collaborators }),
    ...(options.donation === true ? { donation: { account: 'ankhorage' } } : {}),
    package: { entrypoints: ['src/index.ts'] },
    output: { dir: 'paradox' },
  };
}

async function createFixtureAsync(): Promise<string> {
  const root = join(import.meta.dir, '.tmp', `collaborators-${Date.now()}-${Math.random()}`);
  await mkdir(join(root, 'src'), { recursive: true });
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({
      name: '@fixture/collaborators',
      version: '1.0.0',
      description: 'Collaborators fixture.',
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
  await writeFile(join(root, 'src/index.ts'), 'export const value = 1;\n');
  return root;
}

async function renderFixtureAsync(root: string, options: FixtureOptions = {}) {
  const config = createConfig(options);
  const analysis = await analyze(config, { packageRoot: root });
  const model = buildModel(analysis);
  const result = render(model, { outputDir: 'paradox' });
  return { analysis, config, model, result };
}
