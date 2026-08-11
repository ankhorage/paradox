import { describe, expect, test } from 'bun:test';

import { normalizeTypeText } from '../src/analyze/utils/normalizeTypeText.js';

describe('normalizeTypeText', () => {
  test('normalizes Bun node_modules import types to stable package specifiers', () => {
    const mac =
      'Readonly<Record<string, import("/Users/example/git/studio/node_modules/.bun/@ankhorage+contracts@6.0.0/node_modules/@ankhorage/contracts/dist/ui").UiComponentMeta>>';
    const runner =
      'Readonly<Record<string, import("/home/runner/work/studio/studio/node_modules/.bun/@ankhorage+contracts@6.0.0/node_modules/@ankhorage/contracts/dist/ui").UiComponentMeta>>';
    const expected =
      'Readonly<Record<string, import("@ankhorage/contracts/dist/ui").UiComponentMeta>>';

    expect(normalizeTypeText(mac, '/Users/example/git/studio')).toBe(expected);
    expect(normalizeTypeText(runner, '/home/runner/work/studio/studio')).toBe(expected);
  });

  test('normalizes package-local absolute import types relative to the package root', () => {
    expect(
      normalizeTypeText(
        'import("/workspace/package/src/internal/types").InternalType',
        '/workspace/package',
      ),
    ).toBe('import("./src/internal/types").InternalType');
  });

  test('preserves already stable package import types', () => {
    const typeText = 'import("@ankhorage/contracts/dist/ui").UiComponentMeta';
    expect(normalizeTypeText(typeText, '/workspace/package')).toBe(typeText);
  });
});
