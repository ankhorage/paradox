import { DOCUMENTATION_RULE_METADATA } from '@ankhorage/rules-documentation';

export type TagRegistry = ReadonlySet<string>;

export const defaultTagRegistry: TagRegistry = new Set(
  DOCUMENTATION_RULE_METADATA.tags.map((tag) => tag.name),
);
