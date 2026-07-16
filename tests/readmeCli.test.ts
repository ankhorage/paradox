import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

import { analyzeReadmeCli } from '../src/analyze/readmeCli.js';

describe('README CLI analysis', () => {
  test('returns null when the canonical CLI entrypoint does not exist', async () => {
    const root = await mkdtemp(join(tmpdir(), 'paradox-readme-cli-'));
    try {
      expect(await analyzeReadmeCli(root)).toBeNull();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('requires @readme in the leading comment of src/cli/index.ts', async () => {
    const root = await createCliFixture('/***\n * CLI docs.\n */\nexport {};\n');
    try {
      expect(await analyzeReadmeCli(root)).toBeNull();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('uses the leading @readme comment as CLI chapter metadata', async () => {
    const root = await createCliFixture('/***\n * CLI docs.\n *\n * @readme\n */\nexport {};\n');
    try {
      expect(await analyzeReadmeCli(root)).toEqual({
        description: 'CLI docs.',
        sourcePath: 'src/cli/index.ts',
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

async function createCliFixture(source: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'paradox-readme-cli-'));
  const cliRoot = join(root, 'src', 'cli');
  await mkdir(cliRoot, { recursive: true });
  await writeFile(join(cliRoot, 'index.ts'), source);
  return root;
}
