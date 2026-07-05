import { describe, expect, test } from 'bun:test';

import { packageMetadata } from './packageMetadata.js';

describe('metadata', () => {
  test('has a category and surfaces', () => {
    expect(packageMetadata.category).toBe('paradox');
    expect(packageMetadata.capabilities.length).toBeGreaterThan(0);
  });
});
