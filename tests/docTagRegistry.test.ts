import { expect, test } from 'bun:test';

import {
  getParadoxDocTag,
  isParadoxDocTagName,
  PARADOX_DOC_TAGS,
} from '../src/doc-tags/registry.js';

test('projects canonical @performance metadata from documentation Rules', () => {
  expect(isParadoxDocTagName('performance')).toBe(true);
  expect(getParadoxDocTag('performance')).toEqual({
    name: 'performance',
    syntax: '@performance',
    description: 'Marks performance-sensitive behavior and optional optimization notes.',
    appliesTo: ['block', 'symbol'],
    repeatable: false,
    valueKind: 'optional-text',
    handler: 'annotatePerformance',
  });
  expect(PARADOX_DOC_TAGS.map(({ name }) => name)).toContain('performance');
});
