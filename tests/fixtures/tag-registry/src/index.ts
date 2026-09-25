/***
 * Supported fixture documentation tags.
 *
 * @readme
 */
export const FIXTURE_DOC_TAGS = [
  {
    name: 'readme',
    syntax: '@readme',
    description: 'Includes a symbol in README output.',
    appliesTo: ['symbol'],
    repeatable: false,
    handler: 'markReadme',
  },
  {
    name: 'title',
    syntax: '@title',
    description: 'Sets an explicit presentation title.',
    appliesTo: ['symbol'],
    repeatable: false,
    handler: 'setTitle',
  },
] as const;
