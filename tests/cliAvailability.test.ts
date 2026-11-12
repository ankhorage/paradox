import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

import { analyze } from '../src/analyze/analyze.js';
import { createCliAvailabilityFixtureAsync } from './utils/createCliAvailabilityFixtureAsync.js';

describe('CLI availability', () => {
  test('fails loudly for an unimportable declared provider without executing discovered dependencies', async () => {
    const valid = await createCliAvailabilityFixtureAsync({
      name: '@fixture/target',
      provider: 'commands',
      foreignProvider: true,
    });
    const broken = await createCliAvailabilityFixtureAsync({
      name: '@fixture/broken',
      provider: 'broken',
    });

    try {
      await analyze({ package: { entrypoints: ['src/index.ts'] } }, { packageRoot: valid.root });
      const foreignProviderExecuted = await readFile(
        join(valid.root, 'foreign-provider-executed'),
        'utf8',
      )
        .then(() => true)
        .catch(() => false);
      expect(foreignProviderExecuted).toBe(false);
      expect(
        analyze({ package: { entrypoints: ['src/index.ts'] } }, { packageRoot: broken.root }),
      ).rejects.toThrow('provider-import-failed');
    } finally {
      await Promise.all(
        [valid, broken].map((fixture) => rm(fixture.root, { force: true, recursive: true })),
      );
    }
  });
});
