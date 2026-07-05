import { describe, expect, test } from 'bun:test';

import surface from './docsSurface.js';

describe('docs surface handlers', () => {
  test('declares handlers for every command', () => {
    expect(surface.handlers).toHaveLength(surface.commands.length);
  });
});
