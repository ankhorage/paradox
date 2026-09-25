import { DOCUMENTATION_POLICY } from '@ankhorage/policy/documentation';

export type TagRegistry = ReadonlySet<string>;

export const defaultTagRegistry: TagRegistry = new Set(
  DOCUMENTATION_POLICY.tags.map((tag) => tag.name),
);
