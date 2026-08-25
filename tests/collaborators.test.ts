import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test } from 'bun:test';

import { analyze } from '../src/analyze/analyze.js';
import type { ParadoxConfig } from '../src/config/types.js';
import { buildModel } from '../src/model/buildModel.js';
import { render } from '../src/render/render.js';
import { write } from '../src/write/write.js';

test('keeps collaborators support disabled when config is undefined', async () => {
  const root = await createFixtureAsync();
  try {
    const { analysis, model, result } = await renderFixtureAsync(root);
    expect(analysis.collaborators).toBeNull();
    expect(model.collaborators).toBeNull();
    expect(result.collaboratorsWorkflowYaml).toBeNull();
    expect(result.readme).not.toContain('## Collaborators');
    expect(result.readme).not.toContain('<!-- readme: collaborators -start -->');
    expect(result.indexHtml).not.toContain('<h2>Collaborators</h2>');
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('renders the canonical collaborators chapter and workflow', async () => {
  const root = await createFixtureAsync();
  try {
    const { analysis, model, result } = await renderFixtureAsync(root, {
      collaborators: true,
    });
    expect(analysis.collaborators).toBeTrue();
    expect(model.collaborators).toBeTrue();
    expect(result.readme).toContain(
      [
        '## Collaborators',
        '',
        '<!-- readme: collaborators -start -->',
        '<!-- readme: collaborators -end -->',
        '',
      ].join('\n'),
    );
    expect(result.collaboratorsWorkflowYaml).toBe(expectedCollaboratorsWorkflow);
    expect(result.indexHtml).not.toContain('<h2>Collaborators</h2>');
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('renders collaborators before donation when both features are enabled', async () => {
  const root = await createFixtureAsync();
  try {
    const { result } = await renderFixtureAsync(root, {
      collaborators: true,
      donation: true,
    });
    const collaboratorsIndex = result.readme.indexOf('## Collaborators');
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
    await writeFile(workflowPath, expectedCollaboratorsWorkflow);
    const disabled = await renderFixtureAsync(root, { mode: 'safe' });
    await write(disabled.result, disabled.config, {
      packageRoot: root,
      outputRoot: join(root, 'paradox'),
    });
    expect(await readFile(workflowPath, 'utf-8')).toBe(expectedCollaboratorsWorkflow);
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
    expect(firstWorkflow).toBe(expectedCollaboratorsWorkflow);

    await writeFile(
      join(root, 'README.md'),
      firstReadme.replace(
        '<!-- readme: collaborators -end -->',
        '<table><tr><td>Populated by the action</td></tr></table>\n<!-- readme: collaborators -end -->',
      ),
    );
    await write(enabled.result, enabled.config, {
      packageRoot: root,
      outputRoot: join(root, 'paradox'),
    });
    expect(await readFile(join(root, 'README.md'), 'utf-8')).toBe(firstReadme);
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
    const enabled = await renderFixtureAsync(root, { collaborators: true });
    expect(
      write(enabled.result, enabled.config, {
        packageRoot: root,
        outputRoot: join(root, 'paradox'),
      }),
    ).rejects.toThrow('Refusing to overwrite existing non-Paradox');
    expect(await readFile(workflowPath, 'utf-8')).toBe('name: User workflow\n');
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
    const disabled = await renderFixtureAsync(root);
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
    const disabled = await renderFixtureAsync(root);
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
  collaborators?: true;
  donation?: true;
  mode?: 'safe' | 'write';
}

const expectedCollaboratorsWorkflow = [
  '# Generated by Paradox. Do not edit manually.',
  'name: Update collaborators',
  '',
  'on:',
  '  schedule:',
  "    - cron: '17 3 * * 1'",
  '  workflow_dispatch:',
  '',
  'permissions:',
  '  contents: write',
  '  pull-requests: write',
  '',
  'jobs:',
  '  collaborators:',
  '    name: Update collaborators',
  '    runs-on: ubuntu-latest',
  '    steps:',
  '      - name: Update collaborators',
  '        uses: akhilmhdh/contributors-readme-action@83ea0b4f1ac928fbfe88b9e8460a932a528eb79f # v2.3.11',
  '        with:',
  '          readme_path: README.md',
  '          collaborators: direct',
  '        env:',
  '          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}',
  '',
].join('\n');

function createConfig(options: FixtureOptions = {}): ParadoxConfig {
  return {
    mode: options.mode ?? 'write',
    ...(options.collaborators === true ? { collaborators: true } : {}),
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
