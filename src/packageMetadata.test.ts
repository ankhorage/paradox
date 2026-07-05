import { describe, expect, test } from 'bun:test';

import { paradoxPackageMetadata } from './index.js';

describe('package metadata', () => {
  test('declares Paradox package boundary capabilities', () => {
    expect(paradoxPackageMetadata.category).toBe('paradox');
    expect(paradoxPackageMetadata.capabilities).toEqual(['package', 'config', 'model', 'tags']);
  });
});
