import { isRecord } from '@ankhorage/utility/object';
import { describe, expect, test } from 'bun:test';

describe('public capabilities export', () => {
  test('imports the published capability catalog', async () => {
    const capabilityModule: unknown = await import('@ankhorage/paradox/capabilities');
    if (!isRecord(capabilityModule) || !Array.isArray(capabilityModule.CAPABILITIES)) {
      throw new Error('Expected the public capabilities module to export a capability array.');
    }

    expect(capabilityModule.CAPABILITIES).toEqual([
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
