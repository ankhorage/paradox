import { isCapabilityCatalog } from '@ankhorage/capability';
import { describe, expect, test } from 'bun:test';

import { CAPABILITIES } from './index.js';

describe('CAPABILITIES', () => {
  test('publishes one valid unique executable action target', () => {
    expect(CAPABILITIES).toHaveLength(1);
    expect(isCapabilityCatalog(CAPABILITIES)).toBeTrue();

    for (const capability of CAPABILITIES) {
      expect(capability.access).toEqual(['invoke']);
      expect(capability.binding).toEqual({ kind: 'action', bindableAs: ['target'] });
    }
  });
});
