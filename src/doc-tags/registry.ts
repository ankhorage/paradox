/***
 * Supported Paradox documentation tags.
 *
 * Paradox supports doc tags inside triple-star documentation comments.
 *
 * @readme
 */
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
      'Marks a type or interface as part of the Paradox configuration model. @config alone does not imply README inclusion; use @config plus @readme for README output.',
    appliesTo: ['interface', 'type'],
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
