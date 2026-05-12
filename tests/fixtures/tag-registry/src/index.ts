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
    name: 'example',
    syntax: '@example',
    description: 'Adds an example to generated documentation.',
    appliesTo: ['symbol'],
    repeatable: true,
    handler: 'parseExample',
  },
] as const;
