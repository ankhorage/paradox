import { describe, expect, test } from 'bun:test';

import packageJson from '../package.json' with { type: 'json' };
import { CAPABILITIES } from './capabilities/index.js';
import surface from './docsSurface.js';

describe('docs surface handlers', () => {
  test('declares handlers for every command', () => {
    expect(surface.handlers).toHaveLength(surface.commands.length);
  });

  test('keeps catalog, package metadata, provider, and commands aligned', () => {
    expect(packageJson.ankh.capabilities).toEqual(
      CAPABILITIES.map((capability) => ({
        ...capability,
        access: [...capability.access],
        binding: {
          ...capability.binding,
          bindableAs: [...capability.binding.bindableAs],
        },
      })),
    );
    expect(surface.capabilities).toBe(CAPABILITIES);
    expect(surface.version).toBe(packageJson.version);

    const catalogIds = new Set(CAPABILITIES.map((capability) => capability.id));
    const commandIds = new Set(surface.commands.map((command) => command.capability));
    expect(commandIds).toEqual(catalogIds);
    expect(surface.commands).toHaveLength(commandIds.size);
    expect(
      packageJson.ankh.capabilities.every((capability) => typeof capability === 'object'),
    ).toBe(true);
  });
});
