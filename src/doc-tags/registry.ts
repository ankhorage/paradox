import {
  DOCUMENTATION_POLICY,
  type DocumentationTagName,
  type DocumentationTagTarget,
  type DocumentationTagValueKind,
} from '@ankhorage/policy/documentation';

const HANDLERS = {
  readme: 'markReadme',
  usage: 'markUsage',
  config: 'markConfig',
  title: 'setTitle',
  see: 'addSee',
  security: 'addSecurity',
} as const satisfies Record<DocumentationTagName, string>;

interface ParadoxDocTag {
  name: DocumentationTagName;
  syntax: string;
  description: string;
  appliesTo: readonly DocumentationTagTarget[];
  repeatable: boolean;
  valueKind: DocumentationTagValueKind;
  handler: (typeof HANDLERS)[DocumentationTagName];
}

/***
 * Supported Paradox documentation tags projected from the canonical Ankhorage documentation policy.
 *
 * @readme
 */
export const PARADOX_DOC_TAGS: readonly ParadoxDocTag[] = DOCUMENTATION_POLICY.tags.map((tag) => ({
  ...tag,
  syntax: `@${tag.name}`,
  description: describeTag(tag.name),
  handler: HANDLERS[tag.name],
}));

export type ParadoxDocTagName = DocumentationTagName;
export type ParadoxDocTagHandlerId = (typeof HANDLERS)[DocumentationTagName];

/***
 * Looks up documentation tag metadata by tag name.
 */
export function getParadoxDocTag(name: string): ParadoxDocTag | null {
  return PARADOX_DOC_TAGS.find((tag) => tag.name === name) ?? null;
}

/***
 * Checks whether a string is a supported Paradox documentation tag name.
 */
export function isParadoxDocTagName(name: string): name is ParadoxDocTagName {
  return getParadoxDocTag(name) !== null;
}

/***
 * Describes the rendering meaning of one policy-owned documentation tag.
 */
function describeTag(name: DocumentationTagName): string {
  switch (name) {
    case 'readme':
      return 'Promotes the documented item into generated README output.';
    case 'usage':
      return 'Marks real source as package usage documentation.';
    case 'config':
      return 'Marks the canonical package configuration schema root.';
    case 'title':
      return 'Provides an explicit presentation title for a documented item.';
    case 'see':
      return 'Adds a validated external documentation reference.';
    case 'security':
      return 'Links security-sensitive behavior to an exact colocated executable test.';
  }
}
