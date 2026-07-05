import { describe, expect, test } from 'bun:test';

import { packageMetadata } from './packageMetadata.js';

describe('package surfaces', () => {
  test('lists four qualified package surfaces', () => {
    expect(packageMetadata.category).toBe('paradox');
    expect(packageMetadata.capabilities.length).toBe(4);
    expect(packageMetadata.capabilities[0]).toBe('paradox.package');
  });
});
