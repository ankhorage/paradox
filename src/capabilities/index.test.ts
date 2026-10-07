import { isCapability } from '@ankhorage/contracts/capabilities';
import { describe, expect, test } from 'bun:test';

import { CAPABILITIES } from './index.js';

describe('CAPABILITIES', () => {
  test('publishes one valid unique executable action target', () => {
    expect(CAPABILITIES).toHaveLength(1);
    expect(new Set(CAPABILITIES.map((capability) => capability.id)).size).toBe(CAPABILITIES.length);

    for (const capability of CAPABILITIES) {
      expect(isCapability(capability)).toBeTrue();
      expect(capability.access).toEqual(['invoke']);
      expect(capability.binding).toEqual({ kind: 'action', bindableAs: ['target'] });
    }
  });
});
