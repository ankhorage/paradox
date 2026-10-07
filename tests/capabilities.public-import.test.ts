import { describe, expect, test } from 'bun:test';

describe('public capabilities export', () => {
  test('imports the published capability catalog', async () => {
    const { CAPABILITIES } = await import('@ankhorage/paradox/capabilities');

    expect(CAPABILITIES).toEqual([
      {
        id: 'docs.generate',
        owner: '@ankhorage/paradox',
        access: ['invoke'],
        binding: { kind: 'action', bindableAs: ['target'] },
        label: 'Generate documentation',
        description: 'Generate deterministic package documentation.',
      },
    ]);
  });
});
