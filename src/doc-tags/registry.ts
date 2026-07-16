/***
 * Supported Paradox documentation tags.
 *
 * Paradox supports doc tags inside triple-star documentation comments.
 *
 * @readme
 */
const DOC_TAG_PREFIX = '\u0040';
const USAGE_DOC_TAG = `${DOC_TAG_PREFIX}usage` as const;

export const PARADOX_DOC_TAGS = [
  {
    name: 'readme',
    syntax: '@readme',
    description: 'Includes a documentation block or exported symbol in README output.',
    appliesTo: ['block', 'symbol'],
    repeatable: false,
    handler: 'markReadme',
  },
  {
    name: 'config',
    syntax: '@config',
    description:
      'Marks a configuration type, interface, or source block. Pair with @readme to include the schema or actual config source in README Configuration output.',
    appliesTo: ['block', 'interface', 'type'],
    repeatable: false,
    handler: 'markConfig',
  },
  {
    name: 'example',
    syntax: '@example',
    description: 'Adds a titled fenced code example to the generated documentation for a symbol.',
    appliesTo: ['symbol'],
    repeatable: true,
    handler: 'parseExample',
  },
  {
    name: 'usage',
    syntax: USAGE_DOC_TAG,
    description: 'Promotes a real source example into the generated README Usage section.',
    appliesTo: ['block', 'symbol'],
    repeatable: false,
    handler: 'markUsage',
  },
] as const;

export type ParadoxDocTagName = (typeof PARADOX_DOC_TAGS)[number]['name'];
export type ParadoxDocTagHandlerId = (typeof PARADOX_DOC_TAGS)[number]['handler'];

/***
 * Looks up documentation tag metadata by tag name.
 */
export function getParadoxDocTag(name: string): (typeof PARADOX_DOC_TAGS)[number] | null {
  return PARADOX_DOC_TAGS.find((tag) => tag.name === name) ?? null;
}

/***
 * Checks whether a string is a supported Paradox documentation tag name.
 */
export function isParadoxDocTagName(name: string): name is ParadoxDocTagName {
  return getParadoxDocTag(name) !== null;
}
